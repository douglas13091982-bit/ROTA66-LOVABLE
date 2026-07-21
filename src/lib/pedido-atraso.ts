import type { GrupoPedido, PedidoDisponivel } from "@/types/pedido";

/** Minutos a partir dos quais um pedido no pool é considerado "em atraso". */
export const ATRASO_POOL_MINUTOS = 5;

export function minutosNoPool(p: PedidoDisponivel, agora: number = Date.now()): number {
  if (!p.created_at) return 0;
  const t = new Date(p.created_at).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((agora - t) / 60000));
}

/** Maior tempo no pool entre os itens do grupo. */
export function minutosAtrasoGrupo(g: GrupoPedido, agora: number = Date.now()): number {
  let max = 0;
  for (const p of g.items) {
    const m = minutosNoPool(p, agora);
    if (m > max) max = m;
  }
  return max;
}

export function grupoEstaAtrasado(g: GrupoPedido, agora: number = Date.now()): boolean {
  return minutosAtrasoGrupo(g, agora) >= ATRASO_POOL_MINUTOS;
}
