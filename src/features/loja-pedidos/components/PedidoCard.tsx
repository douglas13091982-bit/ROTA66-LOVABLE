import { Bike, KeyRound, X } from "lucide-react";
import { PedidoChatBadge } from "@/components/ChatPedido";
import { STATUS_LABEL, STATUS_COLOR, lojaControlaStatus } from "../logic/constants";
import type { Pedido } from "../hooks/use-pedidos-loja";

// Status em que a loja ainda pode cancelar o pedido sem precisar abrir o detalhe.
// "pronto" entra aqui porque, mesmo liberado para o pool, o entregador pode não
// ter aceitado ainda — então a loja consegue desistir rapidamente.
const CANCELAVEL = new Set(["novo", "aceito", "em_preparo", "pronto"]);

interface Props {
  pedido: Pedido;
  dragId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onOpenDetalhe: (p: Pedido) => void;
  onConfirmarColeta: (p: Pedido) => void;
  onToggleArquivado: (id: string, arquivado: boolean) => void;
  onAbrirWhatsApp: (p: Pedido) => void;
  onCancelar: (p: Pedido) => void;
}

export function PedidoCard({
  pedido: p,
  dragId,
  onDragStart,
  onDragEnd,
  onOpenDetalhe,
  onConfirmarColeta,
  onToggleArquivado,
  onAbrirWhatsApp,
  onCancelar,
}: Props) {
  const lojaControla = lojaControlaStatus(p.status);
  const podeCancelar = CANCELAVEL.has(p.status) && !p.entregador_id;

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={lojaControla}
      onDragStart={(e) => {
        if (!lojaControla) {
          e.preventDefault();
          return;
        }
        onDragStart(p.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={onDragEnd}
      onClick={() => onOpenDetalhe(p)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetalhe(p);
        }
      }}
      className={`group relative w-full text-left bg-card border-2 border-[#0d2c54] shadow-[4px_4px_0_0_rgba(13,44,84,1)] hover:shadow-[6px_6px_0_0_rgba(227,0,15,0.9)] hover:border-[#e3000f] transition-all duration-150 flex flex-col ${
        lojaControla ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      } ${dragId === p.id ? "opacity-50" : ""}`}
    >
      {/* Cabeçalho: número + status + ações */}
      <div className="flex items-start justify-between gap-2 px-3 py-2.5 border-b border-border">
        <div className="min-w-0">
          <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-[#0d2c54]/60">
            Pedido
          </span>
          <span className="font-display text-2xl leading-none tracking-wide text-[#0d2c54]">
            #{p.numero}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <PedidoChatBadge pedidoId={p.id} senderRole="loja" />
            {podeCancelar && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelar(p);
                }}
                title="Cancelar pedido"
                aria-label={`Cancelar pedido #${p.numero}`}
                className="inline-flex items-center justify-center h-6 w-6 border border-[#e3000f] !text-[#e3000f] hover:!bg-[#e3000f] hover:!text-white transition-colors"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>
            )}
          </div>
          <span
            className={`max-w-[130px] truncate px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight ${STATUS_COLOR[p.status]}`}
          >
            {STATUS_LABEL[p.status]}
          </span>
        </div>
      </div>

      {/* Cliente + código de coleta */}
      <div className="px-3 py-2.5 flex flex-col gap-2">
        <div className="min-w-0">
          <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-[#0d2c54]/60">
            Cliente
          </span>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="truncate text-[15px] font-bold uppercase text-[#0d2c54]">
              {p.cliente_nome}
            </span>
            {p.entregador_id && <Bike className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
          </div>
        </div>

        {p.status === "em_rota" && p.codigo_coleta && (
          <div
            className="px-2 py-1.5 border"
            style={{ borderColor: "#e3000f33", backgroundColor: "#fdf6f6" }}
          >
            <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-[#0d2c54]/60">
              Cód. coleta
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-[15px] font-bold tracking-[0.2em] text-[#e3000f]">
              <KeyRound className="h-3.5 w-3.5" />
              {p.codigo_coleta}
            </span>
          </div>
        )}
      </div>

      {/* Rodapé: total */}
      <div className="mt-auto flex items-center justify-between gap-2 px-3 py-2 bg-[#0d2c54]" data-surface="navy">
        <span className="text-[11px] font-medium uppercase tracking-wider !text-white/70">
          Total
        </span>
        <span className="font-display text-lg leading-none !text-[#00E676]">
          R$ {Number(p.valor_total).toFixed(2)}
        </span>
      </div>
    </div>
  );
}


