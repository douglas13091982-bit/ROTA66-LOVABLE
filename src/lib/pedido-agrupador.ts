/**
 * Agrupa pedidos disponíveis em "grupos" — uma rota (mesmo rota_id) ou
 * mesma coleta (loja + endereço de coleta) vira um único card.
 *
 * Função pura: recebe apenas dados primitivos, sem React ou Supabase.
 */

import { normalizarEndereco } from "./endereco";
import type { GrupoPedido, PedidoDisponivel } from "@/types/pedido";

const COORD_PRECISION = 5;

function chaveColeta(p: PedidoDisponivel): string {
  if (p.endereco_coleta_lat != null && p.endereco_coleta_lng != null) {
    const lat = Number(p.endereco_coleta_lat).toFixed(COORD_PRECISION);
    const lng = Number(p.endereco_coleta_lng).toFixed(COORD_PRECISION);
    return `${lat},${lng}`;
  }
  return normalizarEndereco(p.endereco_coleta).toLowerCase();
}

function chaveDoPedido(p: PedidoDisponivel): string {
  if (p.rota_id) return `rota:${p.rota_id}`;
  return `addr:${p.loja_id}|${chaveColeta(p)}`;
}

export function agruparPedidosPorRota(
  pedidos: PedidoDisponivel[],
  dismissed: string[] = [],
): GrupoPedido[] {
  const buckets = new Map<string, PedidoDisponivel[]>();

  for (const pedido of pedidos) {
    const key = chaveDoPedido(pedido);
    const arr = buckets.get(key) ?? [];
    arr.push(pedido);
    buckets.set(key, arr);
  }

  const dismissedSet = new Set(dismissed);

  return Array.from(buckets.entries())
    .filter(([key]) => !dismissedSet.has(key))
    .map(([key, items]) => ({
      key,
      items,
      isRota: items.length > 1,
    }));
}

/** Mescla pedidos vinculados (lojas próprias) e pool externo, dedupando por id. */
export function mesclarPedidosDisponiveis(
  vinculados: PedidoDisponivel[] | undefined,
  externos: PedidoDisponivel[] | undefined,
): PedidoDisponivel[] {
  const map = new Map<string, PedidoDisponivel>();
  for (const p of vinculados ?? []) {
    map.set(p.id, { ...p, _externo: false });
  }
  for (const p of externos ?? []) {
    if (!map.has(p.id)) map.set(p.id, { ...p, _externo: true });
  }
  return Array.from(map.values());
}
