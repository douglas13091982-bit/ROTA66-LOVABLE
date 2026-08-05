import { useEffect, useMemo, useState } from "react";
import { Package } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { PedidoListItem } from "@/components/entregador/PedidoListItem";
import { PedidoRowCompacto } from "@/components/entregador/PedidoRowCompacto";
import { haversineKm, type LatLng } from "@/lib/geo";
import type { GrupoPedido, PedidoDisponivel } from "@/types/pedido";
import { minutosAtrasoGrupo, ATRASO_POOL_MINUTOS } from "@/lib/pedido-atraso";
import { OrdenacaoToggle } from "./OrdenacaoToggle";
import type { OrdenacaoPedidos } from "../hooks/use-ordenacao-pedidos";


interface Props {
  grupos: GrupoPedido[];
  isLoading: boolean;
  minhaPos: LatLng | null;
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
  taxaParaExibir,
  onAceitar,
  ordenacao,
  onOrdenacaoChange,
}: Props) {
  const [detalhe, setDetalhe] = useState<GrupoPedido | null>(null);
  // Tick a cada 30s para reavaliar "em atraso" e o contador de minutos.
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const gruposOrdenados = useMemo(() => {
    const arr = [...grupos];
    const cmpBase = (a: GrupoPedido, b: GrupoPedido) => {
      if (ordenacao === "valor") {
        const va = a.items.reduce((s, p) => s + taxaParaExibir(p), 0);
        const vb = b.items.reduce((s, p) => s + taxaParaExibir(p), 0);
        return vb - va;
      }
      const dEntregaA = distanciaEntregaDesdeColetaKm(a);
      const dEntregaB = distanciaEntregaDesdeColetaKm(b);
      if (Math.abs(dEntregaA - dEntregaB) >= 0.05) {
        return dEntregaA - dEntregaB;
      }
      return distanciaColetaKm(a, minhaPos) - distanciaColetaKm(b, minhaPos);
    };
    arr.sort((a, b) => {
      // Prioridade absoluta: pedidos em atraso vêm sempre no topo,
      // ordenados pelo maior tempo de espera primeiro.
      const atrasoA = minutosAtrasoGrupo(a, agora);
      const atrasoB = minutosAtrasoGrupo(b, agora);
      const aAtrasado = atrasoA >= ATRASO_POOL_MINUTOS;
      const bAtrasado = atrasoB >= ATRASO_POOL_MINUTOS;
      if (aAtrasado !== bAtrasado) return aAtrasado ? -1 : 1;
      if (aAtrasado && bAtrasado && atrasoA !== atrasoB) return atrasoB - atrasoA;
      return cmpBase(a, b);
    });
    return arr;
  }, [grupos, ordenacao, taxaParaExibir, minhaPos, agora]);

  return (
    <div className="max-w-xl mx-auto">
      {isLoading && grupos.length === 0 && (
        <p className="text-sm px-1" style={{ color: "#374151" }}>Carregando pedidos...</p>
      )}

      {!isLoading && grupos.length === 0 && (
        <div className="text-center py-20 px-4">
          <div className="mx-auto mb-6 w-32 h-32 grid place-items-center opacity-40">
            <Package className="h-28 w-28" style={{ color: "#0d2c54", strokeWidth: 1 }} />
          </div>
          <p className="text-[18px] font-black text-[#0d2c54] uppercase tracking-wider">
            Nenhuma entrega disponível
          </p>
          <p className="text-xs mt-2 font-medium" style={{ color: "#6b7688" }}>
            Fique online para receber novos pedidos.
          </p>
        </div>
      )}

      {gruposOrdenados.map((grupo) => (
        <PedidoRowCompacto
          key={grupo.key}
          grupo={grupo}
          minhaPos={minhaPos}
          taxaParaExibir={taxaParaExibir}
          onAbrir={setDetalhe}
          minutosAtraso={minutosAtrasoGrupo(grupo, agora)}
        />
      ))}

      <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content
            className="entregador-theme fixed inset-0 z-50 m-auto flex h-fit flex-col overflow-y-auto overscroll-contain outline-none"
            style={{
              inset: 0,
              margin: "auto",
              translate: "none",
              transform: "none",
              width: "calc(100svw - 1rem)",
              maxWidth: "min(32rem, calc(100svw - 1rem))",
              maxHeight: "calc(100svh - 1rem)",
              background: "transparent",
              border: "none",
            }}
          >
            <VisuallyHidden>
              <DialogTitle>Detalhes do pedido</DialogTitle>
            </VisuallyHidden>

            {detalhe && (
              <PedidoListItem
                grupo={detalhe}
                minhaPos={minhaPos}
                taxaParaExibir={taxaParaExibir}
                onRecusar={() => setDetalhe(null)}
                onAceitar={(g) => {
                  setDetalhe(null);
                  onAceitar(g);
                }}
                minutosAtraso={minutosAtrasoGrupo(detalhe, agora)}
              />
            )}

          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </div>
  );

}
