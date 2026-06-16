import { useMemo } from "react";
import { Package } from "lucide-react";
import { PedidoListItem } from "@/components/entregador/PedidoListItem";
import { haversineKm, type LatLng } from "@/lib/geo";
import type { GrupoPedido, PedidoDisponivel } from "@/types/pedido";
import { OrdenacaoToggle } from "./OrdenacaoToggle";
import type { OrdenacaoPedidos } from "../hooks/use-ordenacao-pedidos";

interface Props {
  grupos: GrupoPedido[];
  isLoading: boolean;
  minhaPos: LatLng | null;
  taxaSistema: number;
  taxaParaExibir: (p: PedidoDisponivel) => number;
  onAceitar: (grupo: GrupoPedido) => void;
  ordenacao: OrdenacaoPedidos;
  onOrdenacaoChange: (v: OrdenacaoPedidos) => void;
}

function distanciaColetaKm(g: GrupoPedido, pos: LatLng | null): number {
  const p = g.items[0];
  if (!pos || !p || p.endereco_coleta_lat == null || p.endereco_coleta_lng == null) {
    return Number.POSITIVE_INFINITY;
  }
  return haversineKm(pos, {
    lat: Number(p.endereco_coleta_lat),
    lng: Number(p.endereco_coleta_lng),
  });
}

/**
 * Menor distância entre a coleta do grupo e qualquer endereço de entrega.
 * Usado como desempate quando vários grupos partem da mesma coleta — a
 * entrega mais próxima da loja vem primeiro.
 */
function distanciaEntregaDesdeColetaKm(g: GrupoPedido): number {
  const p0 = g.items[0];
  if (!p0 || p0.endereco_coleta_lat == null || p0.endereco_coleta_lng == null) {
    return Number.POSITIVE_INFINITY;
  }
  const coleta = {
    lat: Number(p0.endereco_coleta_lat),
    lng: Number(p0.endereco_coleta_lng),
  };
  let min = Number.POSITIVE_INFINITY;
  for (const p of g.items) {
    if (p.endereco_entrega_lat == null || p.endereco_entrega_lng == null) continue;
    const d = haversineKm(coleta, {
      lat: Number(p.endereco_entrega_lat),
      lng: Number(p.endereco_entrega_lng),
    });
    if (d < min) min = d;
  }
  return min;
}

export function RotasDisponiveisList({
  grupos,
  isLoading,
  minhaPos,
  taxaSistema,
  taxaParaExibir,
  onAceitar,
  ordenacao,
  onOrdenacaoChange,
}: Props) {
  const gruposOrdenados = useMemo(() => {
    const arr = [...grupos];
    if (ordenacao === "valor") {
      arr.sort((a, b) => {
        const va = a.items.reduce((s, p) => s + taxaParaExibir(p), 0);
        const vb = b.items.reduce((s, p) => s + taxaParaExibir(p), 0);
        return vb - va;
      });
    } else {
      arr.sort((a, b) => {
        const dColetaA = distanciaColetaKm(a, minhaPos);
        const dColetaB = distanciaColetaKm(b, minhaPos);
        // Quando coletas são iguais (mesma loja), desempata pela entrega mais próxima.
        if (Math.abs(dColetaA - dColetaB) < 0.05) {
          return distanciaEntregaDesdeColetaKm(a) - distanciaEntregaDesdeColetaKm(b);
        }
        return dColetaA - dColetaB;
      });
    }
    return arr;
  }, [grupos, ordenacao, taxaParaExibir, minhaPos]);

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-xl font-bold text-white tracking-tight">Rotas Disponíveis</h2>
        <div
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ color: "oklch(0.72 0.18 27)" }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full animate-pulse"
            style={{ background: "oklch(0.65 0.22 27)" }}
          />
          Em tempo real
        </div>
      </div>

      <OrdenacaoToggle value={ordenacao} onChange={onOrdenacaoChange} />

      {isLoading && grupos.length === 0 && (
        <p className="text-white/45 text-sm px-1">Carregando pedidos...</p>
      )}

      {!isLoading && grupos.length === 0 && (
        <div className="text-center py-10 px-4 rounded-xl border border-white/5 bg-white/[0.02]">
          <Package className="h-10 w-10 text-white/30 mx-auto mb-3" />
          <p className="text-white/55 text-sm">Nenhum pedido disponível no momento.</p>
          <p className="text-white/35 text-xs mt-1">
            Assim que uma loja liberar, aparece aqui.
          </p>
        </div>
      )}

      {gruposOrdenados.map((grupo) => (
        <PedidoListItem
          key={grupo.key}
          grupo={grupo}
          minhaPos={minhaPos}
          taxaSistema={taxaSistema}
          taxaParaExibir={taxaParaExibir}
          onAceitar={onAceitar}
        />
      ))}
    </div>
  );
}
