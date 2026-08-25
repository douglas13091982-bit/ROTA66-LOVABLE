import { ChevronRight, PackageCheck } from "lucide-react";
import { ganhoPedidoEntregador } from "@/lib/ganho-pedido";
import type { PedidoHistorico } from "../logic/types";
import { formatCurrencyValue, formatTime } from "@/lib/format";

export function EntregaRow({ pedido }: { pedido: PedidoHistorico }) {
  const valor = ganhoPedidoEntregador({
    taxa_entrega: pedido.taxa_entrega,
    loja_taxa_por_pedido: pedido.loja_taxa_por_pedido,
    loja_plano_mensal_ativo: pedido.loja_plano_mensal_ativo,
    forma_pagamento: pedido.forma_pagamento,
    agendamento_id: pedido.agendamento_id,
    taxa_turno_entregador: pedido.taxa_turno_entregador,
  });
  const hora = formatTime(pedido.updated_at);
  const lojaNome = pedido.lojas?.nome ?? pedido.cliente_nome ?? "Loja";

  return (
    <div className="flex items-center gap-3 px-3 py-3 rounded-2xl border border-white/10 bg-white/[0.03] transition-colors duration-200 active:bg-white/[0.06]">
      <div
        className="h-11 w-11 shrink-0 rounded-full grid place-items-center"
        style={{ background: "rgba(227,0,15,0.12)", border: "1px solid rgba(227,0,15,0.30)" }}
      >
        <PackageCheck className="h-5 w-5" style={{ color: "#e3000f" }} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-bold text-white truncate uppercase text-[15px]">
          {lojaNome} #{pedido.numero}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[12px] text-white/55">{hora}</span>
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
            style={{ background: "rgba(227,0,15,0.15)", color: "#e3000f" }}
          >
            Concluído
          </span>
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="font-bold text-[17px] text-white whitespace-nowrap">
          R$ {formatCurrencyValue(valor)}
        </div>
        <div className="text-[11px] text-white/50 mt-0.5">Taxa de entrega</div>
      </div>
      <ChevronRight className="h-5 w-5 text-white/35 shrink-0" />
    </div>
  );
}
