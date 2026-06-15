/** Helpers para contar tempo restante das ofertas externas. */

import type { PedidoDisponivel } from "@/types/pedido";

function expiraEmMs(p: PedidoDisponivel): number | null {
  if (!p._externo || !p.oferta_expira_em) return null;
  return new Date(p.oferta_expira_em).getTime();
}

export function segundosRestantesPedido(
  p: PedidoDisponivel,
  nowMs: number,
): number | null {
  const exp = expiraEmMs(p);
  if (exp == null) return null;
  return Math.max(0, Math.ceil((exp - nowMs) / 1000));
}

export function segundosRestantesGrupo(
  items: PedidoDisponivel[],
  nowMs: number,
): number | null {
  const todasExp = items
    .map((p) => expiraEmMs(p))
    .filter((e): e is number => e != null);
  if (todasExp.length === 0) return null;
  return Math.max(0, Math.ceil((Math.min(...todasExp) - nowMs) / 1000));
}
