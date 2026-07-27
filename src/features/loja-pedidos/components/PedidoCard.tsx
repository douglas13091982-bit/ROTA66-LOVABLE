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
      className={`w-full text-left bg-card border border-border/60 rounded-xl px-3 py-2 shadow-card hover:border-[oklch(0.78_0.16_75_/_0.5)] transition-all ${
        lojaControla ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      } ${dragId === p.id ? "opacity-50" : ""}`}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <div className="min-w-0 flex items-center gap-2">
          <span className="font-display text-lg leading-none tracking-wide shrink-0">#{p.numero}</span>
          <span
            className={`min-w-0 truncate px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full ${STATUS_COLOR[p.status]}`}
          >
            {STATUS_LABEL[p.status]}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
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
              className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-zinc-700/60 hover:bg-[oklch(0.55_0.26_25)] text-white/80 hover:text-white transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-[11px] text-muted-foreground">
        <div className="min-w-0 flex items-center gap-1.5">
          <span className="truncate">{p.cliente_nome}</span>
          {p.entregador_id && <Bike className="h-3 w-3 shrink-0 text-emerald-500" />}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {p.status === "em_rota" && p.codigo_coleta && (
            <span className="inline-flex items-center gap-1 font-mono font-bold tracking-widest">
              <KeyRound className="h-3 w-3" />
              {p.codigo_coleta}
            </span>
          )}
          <span className="font-display text-base leading-none text-emerald-500">
            R$ {Number(p.valor_total).toFixed(2)}
          </span>
        </div>
      </div>

    </div>
  );
}

