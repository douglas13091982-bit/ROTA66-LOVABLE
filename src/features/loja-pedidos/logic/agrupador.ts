import { haversineKm } from "@/lib/geo";
import { normalizarEndereco } from "@/lib/endereco";

interface PedidoComCoords {
  id?: string;
  status?: string;
  endereco_coleta?: string | null;
  endereco_coleta_lat?: number | string | null;
  endereco_coleta_lng?: number | string | null;
  endereco_entrega_lat?: number | string | null;
  endereco_entrega_lng?: number | string | null;
  [k: string]: unknown;
}

export interface LoteEmPreparo<P extends PedidoComCoords = PedidoComCoords> {
  key: string;
  items: P[];
  ids: string[];
  raioKm: number;
}

interface Cluster<P> {
  items: P[];
  sumLat: number;
  sumLng: number;
  count: number;
}

/** Identifica a coleta (origem) de um pedido por coordenada ou endereço. */
function chaveColetaLoja(p: PedidoComCoords): string {
  if (p.endereco_coleta_lat != null && p.endereco_coleta_lng != null) {
    return `${Number(p.endereco_coleta_lat).toFixed(5)},${Number(p.endereco_coleta_lng).toFixed(5)}`;
  }
  return normalizarEndereco(p.endereco_coleta ?? "").toLowerCase();
}

function getEntregaCoords(p: PedidoComCoords): { lat: number; lng: number } | null {
  const lat = p.endereco_entrega_lat != null ? Number(p.endereco_entrega_lat) : null;
  const lng = p.endereco_entrega_lng != null ? Number(p.endereco_entrega_lng) : null;
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

function findClusterMatch<P>(
  clusters: Cluster<P>[],
  point: { lat: number; lng: number },
  raioKm: number,
): Cluster<P> | null {
  for (const c of clusters) {
    const centroide = { lat: c.sumLat / c.count, lng: c.sumLng / c.count };
    if (haversineKm(centroide, point) <= raioKm) return c;
  }
  return null;
}

function maxRaioCluster<P extends PedidoComCoords>(c: Cluster<P>): number {
  const centroide = { lat: c.sumLat / c.count, lng: c.sumLng / c.count };
  let maxKm = 0;
  for (const p of c.items) {
    const coords = getEntregaCoords(p);
    if (!coords) continue;
    const d = haversineKm(centroide, coords);
    if (d > maxKm) maxKm = d;
  }
  return maxKm;
}

/**
 * Agrupa pedidos em preparo por mesma coleta + entregas próximas (cluster greedy).
 * Retorna apenas clusters com 2+ pedidos; também agrupa "sem coordenadas".
 */
export function montarLotesEmPreparo<P extends PedidoComCoords>(
  pedidosEmPreparacao: P[],
  raioAgrupamentoKm: number,
): LoteEmPreparo<P>[] {
  const porColeta = new Map<string, P[]>();
  for (const p of pedidosEmPreparacao) {
    if (p.status !== "em_preparo") continue;
    const k = chaveColetaLoja(p);
    const arr = porColeta.get(k) ?? [];
    arr.push(p);
    porColeta.set(k, arr);
  }

  const lotes: LoteEmPreparo<P>[] = [];

  for (const [coletaKey, pedidosColeta] of porColeta) {
    const clusters: Cluster<P>[] = [];
    const semCoord: P[] = [];

    for (const p of pedidosColeta) {
      const coords = getEntregaCoords(p);
      if (!coords) {
        semCoord.push(p);
        continue;
      }
      const alvo = findClusterMatch(clusters, coords, raioAgrupamentoKm);
      if (alvo) {
        alvo.items.push(p);
        alvo.sumLat += coords.lat;
        alvo.sumLng += coords.lng;
        alvo.count += 1;
      } else {
        clusters.push({ items: [p], sumLat: coords.lat, sumLng: coords.lng, count: 1 });
      }
    }

    clusters.forEach((c, idx) => {
      if (c.items.length < 2) return;
      lotes.push({
        key: `${coletaKey}|${idx}`,
        items: c.items,
        ids: c.items.map((p) => p.id),
        raioKm: maxRaioCluster(c),
      });
    });

    if (semCoord.length >= 2) {
      lotes.push({
        key: `${coletaKey}|sem-coord`,
        items: semCoord,
        ids: semCoord.map((p) => p.id),
        raioKm: 0,
      });
    }
  }

  return lotes;
}
