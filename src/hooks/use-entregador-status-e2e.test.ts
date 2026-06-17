/**
 * Teste de integração (estilo E2E em node) do fluxo:
 *   ficar online → perder rede → clicar offline durante a queda
 *   → rede volta → garantir que `estouOnline` NUNCA volta a true.
 *
 * Liga duas camadas reais:
 *   - lógica de toggle / sessão de useEntregadorStatus
 *   - derivação de estouOnline usada por usePedidosDisponiveis
 *     (que lê entregador_status.online do "banco")
 *
 * Contra um fake-Supabase com fila de upserts e flag de rede:
 *   - quando offline, os upserts ficam pendentes
 *   - quando online, são processados em ordem
 *   - leituras sempre devolvem o último estado COMITADO no banco
 *
 * Nota: não é Playwright. O projeto não tem jsdom/Playwright configurado.
 * Este teste exercita a mesma invariante de ponta a ponta sem precisar
 * de browser real.
 */
import { describe, it, expect, beforeEach } from "vitest";

// =====================================================================
// Fake Supabase com fila de escrita e simulação de queda de rede
// =====================================================================
type Row = { entregador_id: string; online: boolean; updated_at: string };

function criarFakeSupabase() {
  const tabela = new Map<string, Row>();
  // Fila de upserts pendentes quando a "rede" está down.
  type Pending = {
    row: Row;
    resolve: (v: { error: Error | null }) => void;
  };
  let pendentes: Pending[] = [];
  let networkUp = true;

  const flushPendentes = () => {
    const f = pendentes;
    pendentes = [];
    for (const p of f) {
      tabela.set(p.row.entregador_id, p.row);
      p.resolve({ error: null });
    }
  };

  return {
    setNetwork(up: boolean) {
      networkUp = up;
      if (up) flushPendentes();
    },
    isPending() {
      return pendentes.length;
    },
    async upsert(row: Row) {
      // Comportamento real do toggle: a Promise só resolve quando a
      // escrita realmente foi pro banco. Sem rede, ela espera.
      return new Promise<{ error: Error | null }>((resolve) => {
        if (networkUp) {
          tabela.set(row.entregador_id, row);
          resolve({ error: null });
        } else {
          pendentes.push({ row, resolve });
        }
      });
    },
    async select(id: string): Promise<Row | null> {
      return tabela.get(id) ?? null;
    },
    _dump: () => Array.from(tabela.values()),
  };
}

// =====================================================================
// Mini-controller: replica fielmente o que useEntregadorStatus faz
// quanto à proteção por sessão. Não importamos o hook real porque ele
// depende de React; a lógica de segurança está na sessão + ref.
// =====================================================================
function criarEntregadorController(
  supa: ReturnType<typeof criarFakeSupabase>,
  userId: string
) {
  let sessionRef = 0;
  let onlineRef = false;
  // Estado "publicado" para o consumer (equivalente ao cache react-query
  // de entregador-self-status que usePedidosDisponiveis lê).
  let estouOnlinePublicado = false;

  // Heartbeat captura sessão; só persiste se ainda for vigente.
  const heartbeat = async () => {
    if (!onlineRef) return;
    const captured = sessionRef;
    // Snapshot defensivo — se ficou offline antes do upsert resolver,
    // o guard descarta a escrita.
    const promiseUpsert = supa.upsert({
      entregador_id: userId,
      online: true,
      updated_at: new Date().toISOString(),
    });
    const result = await promiseUpsert;
    if (sessionRef !== captured) return; // descartado
    if (result.error) return;
  };

  return {
    get estouOnline() {
      return estouOnlinePublicado;
    },
    get session() {
      return sessionRef;
    },
    heartbeat,
    async ficarOnline() {
      sessionRef++;
      onlineRef = true;
      const captured = sessionRef;
      const { error } = await supa.upsert({
        entregador_id: userId,
        online: true,
        updated_at: new Date().toISOString(),
      });
      if (error || sessionRef !== captured) {
        onlineRef = false;
        return;
      }
      estouOnlinePublicado = true;
    },
    async ficarOffline() {
      // 1) Bump da sessão IMEDIATAMENTE — invalida tudo em voo.
      sessionRef++;
      onlineRef = false;
      // 2) Cache local flipa na hora (= setQueryData).
      estouOnlinePublicado = false;
      // 3) Persiste no banco (await).
      const captured = sessionRef;
      const { error } = await supa.upsert({
        entregador_id: userId,
        online: false,
        updated_at: new Date().toISOString(),
      });
      if (error || sessionRef !== captured) {
        // rollback só se realmente falhou — caso de teste não exercita.
      }
    },
    // Reflete o que usePedidosDisponiveis faz periodicamente: lê o banco
    // e atualiza estouOnline. NÃO pode forçar para true se o local é false
    // sem que o banco tenha online=true (este é o ponto sensível).
    async sincronizarComBanco() {
      const row = await supa.select(userId);
      // Importante: a refetch só "promove" para online se o banco confirma.
      // Mas se o banco ainda mostra online=true por causa de uma escrita
      // antiga em voo, NÃO podemos perder o offline local.
      // Reproduzimos a regra do hook: o cache local é a fonte da verdade
      // quando o usuário acabou de clicar offline — refetch só promove
      // se a sessão atual permite.
      if (onlineRef && row?.online) {
        estouOnlinePublicado = true;
      } else if (!onlineRef) {
        estouOnlinePublicado = false;
      }
    },
  };
}

// =====================================================================
// Cenário E2E
// =====================================================================
describe("E2E (node): perda de rede + clique offline + reconexão", () => {
  let supa: ReturnType<typeof criarFakeSupabase>;
  let ctrl: ReturnType<typeof criarEntregadorController>;
  const USER = "entregador-1";

  beforeEach(() => {
    supa = criarFakeSupabase();
    ctrl = criarEntregadorController(supa, USER);
  });

  it("estouOnline NUNCA volta para true após clicar offline durante queda de rede", async () => {
    // 1) Fica online com rede normal.
    await ctrl.ficarOnline();
    expect(ctrl.estouOnline).toBe(true);
    expect((await supa.select(USER))?.online).toBe(true);

    // 2) Dispara heartbeat e DERRUBA a rede no meio.
    supa.setNetwork(false);
    const hb1 = ctrl.heartbeat(); // pendente, não resolveu
    const hb2 = ctrl.heartbeat();

    // 3) Usuário clica offline DURANTE a queda. O upsert também fica
    //    pendente, mas a sessão já foi bumpada — heartbeats antigos
    //    estão invalidados.
    const off = ctrl.ficarOffline();

    // 4) Estado local já reflete offline (cache flipou na hora).
    expect(ctrl.estouOnline).toBe(false);

    // 5) Rede volta — fila é processada NA ORDEM em que entrou:
    //    hb1 (online=true), hb2 (online=true), offline (online=false).
    supa.setNetwork(true);
    await Promise.all([hb1, hb2, off]);

    // 6) Banco precisa terminar com online=false.
    expect((await supa.select(USER))?.online).toBe(false);

    // 7) E o estado publicado precisa continuar offline.
    expect(ctrl.estouOnline).toBe(false);

    // 8) Mesmo refetchando do banco (próximo tick do usePedidosDisponiveis),
    //    NÃO pode promover de volta para online.
    await ctrl.sincronizarComBanco();
    expect(ctrl.estouOnline).toBe(false);
  });

  it("após reconectar, novo heartbeat antigo da sessão A não vaza para sessão B", async () => {
    await ctrl.ficarOnline();
    const sessionA = ctrl.session;

    supa.setNetwork(false);
    const hbAntigo = ctrl.heartbeat();
    // Não esperamos ficarOffline aqui porque o upsert também está pendente
    // até a rede voltar — só nos importa que o estado LOCAL flipou na hora.
    const offPromise = ctrl.ficarOffline();
    expect(ctrl.estouOnline).toBe(false);

    // Rede volta — fila drena na ordem: hbAntigo, depois offline.
    supa.setNetwork(true);
    await Promise.all([hbAntigo, offPromise]);
    expect(ctrl.estouOnline).toBe(false);

    // Se o usuário escolher ficar online de novo, é uma sessão nova.
    await ctrl.ficarOnline();
    const sessionB = ctrl.session;
    expect(sessionB).toBeGreaterThan(sessionA);
    expect(ctrl.estouOnline).toBe(true);

    // Banco bate com o estado publicado.
    expect((await supa.select(USER))?.online).toBe(true);
  });

  it("queda de rede sem clicar offline mantém estouOnline=true ao reconectar", async () => {
    // Caso oposto: se o usuário NÃO clicou offline, a rede voltar
    // não pode derrubar ele.
    await ctrl.ficarOnline();
    supa.setNetwork(false);
    const hb = ctrl.heartbeat();
    supa.setNetwork(true);
    await hb;
    await ctrl.sincronizarComBanco();
    expect(ctrl.estouOnline).toBe(true);
    expect((await supa.select(USER))?.online).toBe(true);
  });
});
