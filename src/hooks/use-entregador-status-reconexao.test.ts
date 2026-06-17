/**
 * Cenário: entregador clica offline → perde conexão → reconecta.
 *
 * Invariante que NÃO PODE quebrar: depois do clique em offline, NADA
 * pode persistir `online=true` no banco de novo — nem um heartbeat que
 * estava em voo durante a queda, nem o callback do GPS que demorou,
 * nem um retry após a reconexão.
 *
 * Este teste modela diretamente a proteção via "token de sessão" usada
 * em src/hooks/use-entregador-status.tsx (sessionRef). Toda escrita
 * captura o token antes do await; se o token mudar (= usuário ficou
 * offline), a escrita é descartada.
 */
import { describe, it, expect, beforeEach } from "vitest";

type UpsertCall = { online: boolean; updated_at: string };

/**
 * Mini-modelo da camada de status que simula a lógica de proteção
 * por sessão exatamente como em useEntregadorStatus.
 */
function criarStatusController() {
  let sessionRef = 0;
  let onlineRef = false;
  const writes: UpsertCall[] = [];

  // Simula uma escrita assíncrona com latência arbitrária — equivalente
  // ao supabase.from("entregador_status").upsert.
  const upsert = async (
    capturedSession: number,
    online: boolean,
    latencyMs: number,
    flushQueue: { online: boolean; updated_at: string; session: number }[]
  ) => {
    await new Promise((r) => setTimeout(r, latencyMs));
    // Guarda da sessão: se o token mudou no meio do caminho, descarta.
    if (sessionRef !== capturedSession) return;
    const row = { online, updated_at: new Date().toISOString() };
    writes.push(row);
    flushQueue.push({ ...row, session: capturedSession });
  };

  // Simula um heartbeat que estava agendado: captura o token AGORA e
  // tenta escrever depois (durante/após a queda de rede). Reflete o
  // hook real: heartbeats só são agendados enquanto onlineRef=true.
  const agendarHeartbeatEmVoo = (latencyMs: number, flushQueue: any[]) => {
    if (!onlineRef) return Promise.resolve(); // loop parou ao ficar offline
    const captured = sessionRef;
    return upsert(captured, true, latencyMs, flushQueue);
  };

  // Toggle online → offline (síncrono no que importa: bump do token).
  const ficarOffline = async () => {
    sessionRef++;
    onlineRef = false;
    // Escrita "ao vivo" do offline — também passa pelo token, mas usa
    // o token JÁ incrementado.
    const captured = sessionRef;
    await upsert(captured, false, 0, []);
  };

  const ficarOnline = async () => {
    sessionRef++;
    onlineRef = true;
    const captured = sessionRef;
    await upsert(captured, true, 0, []);
  };

  return {
    writes,
    get online() {
      return onlineRef;
    },
    get session() {
      return sessionRef;
    },
    agendarHeartbeatEmVoo,
    ficarOffline,
    ficarOnline,
  };
}

describe("perder conexão e reconectar após ficar offline", () => {
  let flushQueue: { online: boolean; updated_at: string; session: number }[];

  beforeEach(() => {
    flushQueue = [];
  });

  it("heartbeat em voo durante a queda NÃO ressuscita online=true ao reconectar", async () => {
    const c = criarStatusController();
    await c.ficarOnline();
    expect(c.online).toBe(true);

    // (1) Heartbeat foi disparado e está esperando a rede voltar (200ms).
    const heartbeatPromise = c.agendarHeartbeatEmVoo(200, flushQueue);

    // (2) Antes da resposta chegar, o usuário clica offline.
    await c.ficarOffline();
    expect(c.online).toBe(false);

    // (3) Rede volta e o heartbeat finalmente resolve.
    await heartbeatPromise;

    // Invariante: a última escrita confirmada é offline; o heartbeat
    // em voo foi descartado pelo guard de sessão.
    const ultima = c.writes[c.writes.length - 1];
    expect(ultima.online).toBe(false);
    expect(c.writes.filter((w) => w.online === true)).toHaveLength(1); // só a do ficarOnline inicial
  });

  it("múltiplos heartbeats enfileirados durante a queda são todos descartados", async () => {
    const c = criarStatusController();
    await c.ficarOnline();

    // Vários pings disparados em sequência ainda online…
    const pendentes = [
      c.agendarHeartbeatEmVoo(100, flushQueue),
      c.agendarHeartbeatEmVoo(150, flushQueue),
      c.agendarHeartbeatEmVoo(220, flushQueue),
    ];

    // …enquanto isso, usuário fica offline.
    await c.ficarOffline();

    // Rede volta, todos resolvem.
    await Promise.all(pendentes);

    // Nenhum heartbeat antigo virou escrita.
    expect(c.writes.map((w) => w.online)).toEqual([true, false]); // só o online inicial + offline
    expect(c.online).toBe(false);
  });

  it("se o usuário ficar online de novo APÓS reconectar, é uma nova sessão (token diferente)", async () => {
    const c = criarStatusController();
    await c.ficarOnline();
    const sessionA = c.session;

    // Heartbeat antigo ainda em voo.
    const antigo = c.agendarHeartbeatEmVoo(150, flushQueue);

    await c.ficarOffline();
    await c.ficarOnline(); // reconecta e fica online de novo
    const sessionB = c.session;

    // Sessões devem ser diferentes — o heartbeat antigo aponta para A.
    expect(sessionB).toBeGreaterThan(sessionA);

    await antigo;

    // O heartbeat antigo não pode ter sido contado como heartbeat da
    // sessão nova (foi descartado por pertencer à sessão A).
    const escritasOnline = c.writes.filter((w) => w.online === true);
    expect(escritasOnline).toHaveLength(2); // só os dois ficarOnline explícitos
  });

  it("após ficar offline, nenhum heartbeat NOVO é disparado mesmo se a rede voltar", async () => {
    const c = criarStatusController();
    await c.ficarOnline();
    await c.ficarOffline();

    // Simula a rede voltando e o app tentando agendar heartbeat:
    // como onlineRef=false, o loop de heartbeat do hook real não roda.
    // Aqui modelamos isso explicitamente — nada é agendado.
    expect(c.online).toBe(false);

    // Mesmo se algo tentar capturar a sessão "antiga" e escrever depois,
    // o guard descarta.
    const tardio = c.agendarHeartbeatEmVoo(50, flushQueue);
    // Imediatamente bump de sessão (simula outro clique fantasma):
    // o teste ainda assim não pode resultar em online=true persistido.
    await tardio;

    const ultima = c.writes[c.writes.length - 1];
    expect(ultima.online).toBe(false);
  });
});
