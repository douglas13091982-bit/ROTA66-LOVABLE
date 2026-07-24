import { liquidoEntregador } from "@/hooks/use-taxa-sistema";
import type { PedidoHistorico } from "../logic/types";

export function EntregaRow({ pedido }: { pedido: PedidoHistorico }) {
  const taxaLoja = Number(pedido.loja_taxa_por_pedido ?? 0);
  const valor = liquidoEntregador(pedido.taxa_entrega, taxaLoja, pedido.loja_plano_mensal_ativo, pedido.forma_pagamento);
  const hora = new Date(pedido.updated_at).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const lojaNome = pedido.lojas?.nome ?? pedido.cliente_nome ?? "Loja";

  return (
    <div className="group flex items-start justify-between gap-3 px-4 py-3 border-b border-border/30 last:border-b-0 transition-colors duration-200 hover:bg-white/[0.02]">
      <div className="min-w-0 flex-1">
        <div className="font-bold text-white truncate">
          {lojaNome} <span className="text-white">#{pedido.numero}</span>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-muted-foreground">{hora}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#AE0000]/15 text-[#AE0000]">
            Concluído
          </span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-bold text-lg text-white whitespace-nowrap">
          R$ {valor.toFixed(2).replace(".", ",")}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">Taxa de entrega</div>
      </div>
    </div>
  );
}
