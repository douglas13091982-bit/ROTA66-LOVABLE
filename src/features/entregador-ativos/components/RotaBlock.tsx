import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { norm } from "../logic/group";
import type { PedidoAtivo } from "../logic/types";
import { ColetaConsolidadaCard } from "./ColetaConsolidadaCard";
import { PedidoCard } from "./PedidoCard";

type Props = {
  items: PedidoAtivo[];
  destaque?: string;
};

export function RotaBlock({ items, destaque }: Props) {
  const qc = useQueryClient();
  const [coletaFixada, setColetaFixada] = useState(false);

  const coletaRef = items[0];
  const mesmaColeta = useMemo(() => 
    items.every((p) => norm(p.endereco_coleta) === norm(coletaRef.endereco_coleta)),
    [items, coletaRef.endereco_coleta]
  );

  const pendentesColeta = items.filter((p) => p.status === "em_rota");
  const pendentesEntrega = items.filter((p) => p.status === "coletado");

  // Se tem apenas 1 item, usa o PedidoCard padrão (que já tem sua própria lógica de fixação)
  if (items.length === 1) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PedidoCard pedido={items[0]} destaque={destaque} />
      </div>
    );
  }

  // Fase 1: Coleta Agrupada
  // Mantemos esta fase se houver algo para coletar OU se o entregador acabou de coletar e ainda não saiu
  if (mesmaColeta && (pendentesColeta.length > 0 || coletaFixada)) {
    // Se fixado mas já coletou, mostra os que foram coletados para ver os códigos
    const pedidosParaMostrar = pendentesColeta.length > 0 ? pendentesColeta : pendentesEntrega;

    return (
      <ColetaConsolidadaCard
        pedidos={pedidosParaMostrar}
        totalRota={items.length}
        onSairDoLocal={() => {
          setColetaFixada(false);
          qc.invalidateQueries({ queryKey: ["pedidos-ativos"] });
        }}
        // Avisa que a coleta foi iniciada para fixar o componente
        onColetar={() => setColetaFixada(true)}
      />
    );
  }

  // Fase 2: Entregas (uma por vez)
  if (pendentesEntrega.length > 0) {
    const proxima = pendentesEntrega[0];
    const idxAtual = items.findIndex((p) => p.id === proxima.id);
    const restantes = pendentesEntrega.length;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between bg-white border border-border/40 rounded-xl px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] shadow-sm">
          <span className="text-muted-foreground font-bold">
            Rota agrupada · {items.length} paradas
          </span>
          <span className="font-bold text-[#AE0000] drop-shadow-sm">
            Entrega {idxAtual + 1}/{items.length} · faltam {restantes}
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="relative">
            <span className="absolute -top-2 -left-2 z-10 w-8 h-8 rounded-full bg-gradient-red text-primary-foreground font-display text-base flex items-center justify-center shadow-red border border-primary/40">
              {idxAtual + 1}
            </span>
            <PedidoCard pedido={proxima} destaque={destaque} agrupado />
          </div>
        </div>
      </div>
    );
  }

  return null;
}
