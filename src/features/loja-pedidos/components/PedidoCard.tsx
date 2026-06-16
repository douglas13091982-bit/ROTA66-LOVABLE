import { Bike, KeyRound, MessageCircle, Archive, ArchiveRestore, X } from "lucide-react";
import { EntregadorNomeBadge } from "@/components/EntregadorNomeBadge";
import { ChatPedidoButton, PedidoChatBadge } from "@/components/ChatPedido";
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
  const mostrarAcoes =
    p.status === "entregue" || p.status === "em_rota" || p.codigo_entrega;

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
      className={`w-full text-left bg-card border border-[oklch(0.78_0.16_75_/_0.40)] rounded-md p-2 shadow-card hover:border-[oklch(0.78_0.16_75_/_0.65)] transition-all ${
        lojaControla ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      } ${dragId === p.id ? "opacity-50" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="font-display text-base tracking-wide leading-none">#{p.numero}</div>
        <div className="flex items-center gap-1.5">
          <PedidoChatBadge pedidoId={p.id} senderRole="loja" />
          <span
            className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full ${STATUS_COLOR[p.status]}`}
          >
            {STATUS_LABEL[p.status]}
          </span>
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
      <div className="mt-1 text-xs font-medium truncate">{p.cliente_nome}</div>
      {p.rota_id && (
        <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 bg-[oklch(0.40_0.06_265_/_0.15)] text-[oklch(0.75_0.08_265)] text-[9px] font-bold uppercase tracking-wider rounded">
          <Bike className="h-2.5 w-2.5" />
          Rota {p.rota_ordem ? `· parada ${p.rota_ordem}` : "agrupada"}
          {p.atribuido_automaticamente && " · auto"}
          {p.duracao_estimada_seg != null &&
            ` · ${Math.max(1, Math.round(p.duracao_estimada_seg / 60))} min`}
        </div>
      )}
      {p.entregador_id && <EntregadorNomeBadge pedidoId={p.id} />}
      <div className="mt-2 pt-2 border-t border-border/40 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-display text-base text-primary leading-none">
            R$ {Number(p.valor_total).toFixed(2)}
          </span>
          <span onClick={(e) => e.stopPropagation()}>
            <ChatPedidoButton
              pedidoId={p.id}
              pedidoNumero={p.numero}
              senderRole="loja"
              variant="ghost"
            />
          </span>
        </div>
        {mostrarAcoes && (
          <div className="flex flex-wrap items-center gap-1.5">
            {p.status === "entregue" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleArquivado(p.id, p.arquivado);
                }}
                className={`inline-flex items-center gap-1 px-2 py-1 font-bold uppercase text-[9px] tracking-wider rounded ${
                  p.arquivado
                    ? "bg-[oklch(0.55_0.16_75)] hover:bg-[oklch(0.65_0.14_75)] text-[#0e0f12]"
                    : "bg-zinc-600 hover:bg-zinc-700 text-white"
                }`}
                title={p.arquivado ? "Desarquivar" : "Arquivar"}
              >
                {p.arquivado ? <ArchiveRestore className="h-2.5 w-2.5" /> : <Archive className="h-2.5 w-2.5" />}
                {p.arquivado ? "Desarquivar" : "Arquivar"}
              </button>
            )}
            {p.status === "em_rota" && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirmarColeta(p);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 bg-[oklch(0.40_0.06_265)] hover:bg-[oklch(0.45_0.06_265)] text-white font-bold uppercase text-[9px] tracking-wider rounded"
              >
                <KeyRound className="h-2.5 w-2.5" /> Coleta
              </span>
            )}
            {p.codigo_entrega && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onAbrirWhatsApp(p);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 bg-[oklch(0.55_0.16_75)] hover:bg-[oklch(0.60_0.14_75)] text-[#0e0f12] font-bold uppercase text-[9px] tracking-wider rounded"
              >
                <MessageCircle className="h-2.5 w-2.5" /> Rastreio
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
