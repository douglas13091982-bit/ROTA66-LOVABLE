/**
 * Cenário: entregador clica em "offline" no app.
 *
 * Mesmo que o heartbeat (`updated_at`) tenha sido gravado há poucos segundos,
 * a flag `online=false` precisa fazer o entregador sumir IMEDIATAMENTE
 * do mapa e da lista da loja — sem esperar o TTL expirar.
 *
 * Este teste reproduz exatamente a lógica usada em:
 *   - src/features/loja-dashboard/hooks/use-entregadores-vinculados.ts
 *     (deriva `online` via isEffectivelyOnline antes de ordenar/exibir)
 *   - RPC `entregadores_online_loja` (filtra por online=true)
 *
 * Garante que o bug "entregador continua aparecendo online na loja após
 * clicar em offline" não volte.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null }) }),
      }),
    }),
  },
}));

import { isEffectivelyOnline } from "./entregador-online";

type StatusRow = {
  entregador_id: string;
  online: boolean;
  updated_at: string | null;
};

/**
 * Reproduz o filtro/derivação aplicado no painel da loja:
 * mostra apenas entregadores cujo status efetivo é online.
 */
function filtrarVisiveisNaLoja(
  rows: StatusRow[],
  ttlMin: number,
  now: number
): StatusRow[] {
  return rows
    .map((r) => ({ ...r, online: isEffectivelyOnline(r.online, r.updated_at, ttlMin, now) }))
    .filter((r) => r.online);
}

describe("entregador clica offline → some imediatamente da loja", () => {
  const NOW = new Date("2026-06-17T12:00:00Z").getTime();
  const TTL = 10;
  const HEARTBEAT_RECENTE = new Date(NOW - 5_000).toISOString(); // 5s atrás

  it("entregador online com heartbeat recente aparece para a loja", () => {
    const visiveis = filtrarVisiveisNaLoja(
      [{ entregador_id: "e1", online: true, updated_at: HEARTBEAT_RECENTE }],
      TTL,
      NOW
    );
    expect(visiveis).toHaveLength(1);
    expect(visiveis[0].entregador_id).toBe("e1");
  });

  it("após clicar offline (online=false) some IMEDIATAMENTE, mesmo com heartbeat recente", () => {
    // Estado após o toggle: o app grava online=false mas o updated_at
    // continua sendo "agora" (a escrita é recente).
    const visiveis = filtrarVisiveisNaLoja(
      [{ entregador_id: "e1", online: false, updated_at: new Date(NOW).toISOString() }],
      TTL,
      NOW
    );
    expect(visiveis).toEqual([]);
  });

  it("entregador que apenas fechou o app (online=true, heartbeat velho) também some após o TTL", () => {
    const heartbeatVelho = new Date(NOW - (TTL + 1) * 60_000).toISOString();
    const visiveis = filtrarVisiveisNaLoja(
      [{ entregador_id: "e1", online: true, updated_at: heartbeatVelho }],
      TTL,
      NOW
    );
    expect(visiveis).toEqual([]);
  });

  it("em uma lista mista, apenas os que estão de fato online aparecem", () => {
    const rows: StatusRow[] = [
      { entregador_id: "online-ok", online: true, updated_at: HEARTBEAT_RECENTE },
      // Acabou de clicar offline:
      { entregador_id: "clicou-offline", online: false, updated_at: new Date(NOW).toISOString() },
      // Fechou o app há muito tempo:
      {
        entregador_id: "app-fechado",
        online: true,
        updated_at: new Date(NOW - 60 * 60_000).toISOString(),
      },
      // Nunca enviou heartbeat:
      { entregador_id: "sem-heartbeat", online: true, updated_at: null },
    ];

    const visiveis = filtrarVisiveisNaLoja(rows, TTL, NOW);
    expect(visiveis.map((r) => r.entregador_id)).toEqual(["online-ok"]);
  });
});
