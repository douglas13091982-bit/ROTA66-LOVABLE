import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Calendar,
  User,
  Phone,
  MapPin,
  FileText,
  Printer,
  X,
  KeyRound,
  Archive,
  ArchiveRestore,
  MessageCircle,
  Send,
} from "lucide-react";
import { EntregadorPixCard } from "@/components/EntregadorPixCard";

import { formatDateTime } from "@/lib/format";
import { STATUS_LABEL, STATUS_COLOR, NEXT } from "../logic/constants";
import { imprimirPedido } from "../logic/print-pedido";
import type { Pedido } from "../hooks/use-pedidos-loja";
import type { PedidoActions } from "../hooks/use-pedido-actions";

interface Props {
  detalhe: Pedido | null;
  lojaNome?: string | null;
  actions: PedidoActions;
  onClose: () => void;
  onConfirmarColeta: (p: Pedido) => void;
  onUpdateDetalhe: (next: Pedido | null) => void;
}

export function PedidoDrawer({
  detalhe,
  lojaNome,
  actions,
  onClose,
  onConfirmarColeta,
  onUpdateDetalhe,
}: Props) {
  if (!detalhe) {
    return (
      <Sheet open={false} onOpenChange={(o) => { if (!o) onClose(); }}>
        <SheetContent />
      </Sheet>
    );
  }

  const bonus = Number(detalhe.bonus_entregador ?? 0);
  const valorProdutos = Number(
    detalhe.valor_produtos ?? Number(detalhe.valor_total) - Number(detalhe.taxa_entrega ?? 0),
  );
  const taxa = Number(detalhe.taxa_entrega ?? 0);
  // Prefere o snapshot da taxa do plano aplicada no momento do pedido.
  // Se o snapshot vier zero/nulo (pedidos antigos ou criados antes da correção),
  // usa a taxa por pedido atual da loja como fallback, limitada pela taxa de
  // entrega para nunca deixar o frete negativo.
  const snapshotAplicada = Number(detalhe.taxa_por_pedido_aplicada ?? 0);
  const taxaLojaAtual = Number(detalhe.loja_taxa_por_pedido ?? 0);
  const taxaPorPedido =
    snapshotAplicada > 0
      ? Math.min(snapshotAplicada, taxa)
      : Math.min(taxaLojaAtual, taxa);
  const taxaGlobal = Math.max(0, taxa - taxaPorPedido);
  const freteEntregador = taxaGlobal;



  const podeAvancar =
    (detalhe.status === "novo" || detalhe.status === "aceito" || detalhe.status === "em_preparo") &&
    NEXT[detalhe.status];

  return (
    <Sheet open onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        className="panel-premium panel-light w-full sm:max-w-none sm:w-1/2 overflow-y-auto bg-white border-l border-[#e4e8ef] text-[#0f1b2d]"
      >
        <SheetHeader className="pb-4 border-b border-[#e4e8ef]">
          <SheetTitle className="pp-title-page text-3xl text-[#0f1b2d] flex items-center justify-between gap-3">
            <span>Pedido <span className="text-[#AE0000]">#{detalhe.numero}</span></span>
            <div className="flex items-center gap-2">
              {detalhe.origem === "ifood" && (
                <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]  bg-red-600 text-white">
                  iFood
                </span>
              )}
              <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]  ${STATUS_COLOR[detalhe.status]}`}>
                {STATUS_LABEL[detalhe.status]}
              </span>
            </div>
          </SheetTitle>
          <SheetDescription className="flex items-center gap-1.5 text-xs pp-eyebrow !tracking-[0.2em]">
            <Calendar className="h-3 w-3" />
            {formatDateTime(detalhe.created_at)}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 text-sm pp-reveal pt-5">
          <div className="pp-card p-4 space-y-2">
            <div className="pp-eyebrow">Cliente</div>
            <div className="flex items-center gap-2 text-[#0f1b2d]"><User className="h-4 w-4 text-[#AE0000]" /> {detalhe.cliente_nome}</div>
            <div className="flex items-center gap-2 text-[#0f1b2d]"><Phone className="h-4 w-4 text-[#AE0000]" /> {detalhe.cliente_telefone}</div>
          </div>

          <div className="pp-card p-4 space-y-2">
            <div className="pp-eyebrow">
              {(detalhe as any).tipo_entrega === "retirada"
                ? "Retirada no balcão"
                : "Endereço"}
            </div>
            <div className="flex items-start gap-2 text-[#0f1b2d]">
              <MapPin className="h-4 w-4 mt-0.5 text-[#AE0000] shrink-0" />
              <span>
                {(detalhe as any).tipo_entrega === "retirada"
                  ? "Cliente retira o pedido na loja (sem entregador)"
                  : `${detalhe.endereco_entrega}${detalhe.complemento ? `, ${detalhe.complemento}` : ""}`}
              </span>
            </div>
          </div>


          {detalhe.observacoes && (
            <div className="pp-card p-4 space-y-2">
              <div className="pp-eyebrow">Observações</div>
              <div className="flex items-start gap-2 text-[#0f1b2d]">
                <FileText className="h-4 w-4 mt-0.5 text-[#AE0000] shrink-0" />
                <span className="whitespace-pre-wrap">{detalhe.observacoes}</span>
              </div>
            </div>
          )}

          {Array.isArray(detalhe.itens) && detalhe.itens.length > 0 && (
            <div className="pp-card p-4 space-y-2">
              <div className="pp-eyebrow">Itens</div>
              <div className=" divide-y divide-[#eef1f6] border border-[#e4e8ef] overflow-hidden">
                {detalhe.itens.map((it: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-2 text-xs bg-[#f7f9fc]">
                    <span className="truncate text-[#0f1b2d]">
                      {it.quantidade ? `${it.quantidade}× ` : ""}{it.nome ?? it.descricao ?? "Item"}
                    </span>
                    {it.preco != null && (
                      <span className="pp-num text-sm text-[#AE0000]">R$ {Number(it.preco).toFixed(2)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pp-card p-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[#6b7688]">Itens</span>
              <span className="pp-num text-[#0f1b2d]">R$ {valorProdutos.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#6b7688]">Taxa de entrega</span>
              <span className="pp-num text-[#0f1b2d]">R$ {taxa.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between pl-3 text-xs">
              <span className="text-[#6b7688]">↳ Taxa global (frete)</span>
              <span className="pp-num text-[#6b7688]">R$ {taxaGlobal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between pl-3 text-xs">
              <span className="text-[#6b7688]">↳ Taxa por pedido da loja</span>
              <span className="pp-num text-[#6b7688]">R$ {taxaPorPedido.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between pl-3 text-xs">
              <span className="text-[#6b7688]">↳ Entregador recebe</span>
              <span className="pp-num text-[#AE0000]">R$ {freteEntregador.toFixed(2)}</span>
            </div>

            {bonus > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[#6b7688]">Bônus ao entregador</span>
                <span className="pp-num text-[#AE0000]">+ R$ {bonus.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-3 mt-1 border-t border-[#e4e8ef]">
              <span className="pp-eyebrow">Total</span>
              <span className="pp-num text-3xl text-[#AE0000]">R$ {Number(detalhe.valor_total).toFixed(2)}</span>
            </div>
          </div>

          {detalhe.codigo_coleta && detalhe.status !== "entregue" && detalhe.status !== "cancelado" && (
            <div className="pp-card p-4 space-y-3 border border-[#AE0000]/25 bg-white shadow-[0_1px_8px_rgba(15,27,45,0.06)]">
              <div className="pp-eyebrow flex items-center gap-2" style={{ color: "#AE0000" }}>
                <KeyRound className="h-3.5 w-3.5" /> Código de coleta (confira com o entregador)
              </div>
              <div className="flex justify-center gap-2">
                {String(detalhe.codigo_coleta).split("").map((d, i) => (
                  <div
                    key={i}
                    className="h-12 w-10 flex items-center justify-center border text-2xl font-mono font-bold tracking-wide"
                    style={{ borderColor: "#AE000033", backgroundColor: "#fdf6f6", color: "#AE0000" }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-center font-semibold" style={{ color: "#0f1b2d" }}>
                Peça para o entregador mostrar o mesmo número no app antes de liberar o pedido.
              </div>
            </div>

          )}

          {detalhe.entregador_id && (
            <EntregadorPixCard pedidoId={detalhe.id} pedidoNumero={detalhe.numero} />
          )}

          {detalhe.codigo_entrega && (
            <div className="pp-card p-4 space-y-3">
              <div className="pp-eyebrow">Rastreio do cliente</div>
              <div className="flex items-center gap-2 text-xs">
                <span className="pp-num font-mono bg-[#f7f9fc] px-2.5 py-1 border border-[#e4e8ef] text-[#AE0000] tracking-widest">{detalhe.codigo_entrega}</span>
                <span className="text-[#6b7688]">código de confirmação</span>
              </div>
              <a
                href={`${window.location.origin}/rastreio/${detalhe.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#AE0000] hover:underline"
              >
                <MapPin className="h-3 w-3" /> Abrir link de rastreio
              </a>
              <button
                onClick={() => actions.abrirWhatsAppRastreio(detalhe)}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-[oklch(0.55_0.26_25)] hover:bg-[oklch(0.48_0.24_25)] text-white font-semibold uppercase text-xs tracking-[0.15em] "
              >
                <MessageCircle className="h-4 w-4" /> Rastreio pelo WhatsApp
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={() => imprimirPedido(detalhe as any, lojaNome ?? undefined)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#f1f4f9] text-[#0f1b2d] border border-[#dfe4ec] font-semibold uppercase text-xs tracking-[0.15em] "
            >
              <Printer className="h-3.5 w-3.5" /> Imprimir
            </button>

            {podeAvancar && (
              <button
                onClick={() => {
                  const next = NEXT[detalhe.status]!;
                  actions.updateStatus(detalhe.id, next);
                  onUpdateDetalhe({ ...detalhe, status: next });
                }}
                className="pp-cta uppercase tracking-[0.15em]"
              >
                Avançar para {STATUS_LABEL[NEXT[detalhe.status]!]}
              </button>
            )}
            {detalhe.status !== "entregue" && detalhe.status !== "cancelado" && (
              <button
                onClick={() => {
                  if (window.confirm(`Cancelar pedido #${detalhe.numero}? Ele será movido para os arquivados e poderá ser reenviado aos entregadores depois.`)) {
                    actions.cancelarPedido(detalhe.id);
                    onUpdateDetalhe({ ...detalhe, status: "cancelado", arquivado: true });
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold uppercase text-xs tracking-wider "
              >
                <X className="h-3.5 w-3.5" /> Cancelar pedido
              </button>
            )}
            {detalhe.status === "cancelado" && (
              <button
                onClick={() => {
                  if (window.confirm(`Reenviar pedido #${detalhe.numero} aos entregadores? Ele voltará para o status "Pronto" e será oferecido novamente.`)) {
                    actions.reenviarParaEntregadores(detalhe.id);
                    onUpdateDetalhe({
                      ...detalhe,
                      status: "pronto",
                      entregador_id: null,
                      arquivado: false,
                      
                      coleta_confirmada_em: null,
                    });
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[oklch(0.50_0.24_25)] hover:bg-[oklch(0.55_0.24_25)] text-white font-bold uppercase text-xs tracking-wider "
              >
                <Send className="h-3.5 w-3.5" /> Reenviar aos entregadores
              </button>
            )}
            {detalhe.status === "entregue" && (
              <button
                onClick={() => {
                  actions.toggleArquivado(detalhe.id, detalhe.arquivado);
                  onUpdateDetalhe({ ...detalhe, arquivado: !detalhe.arquivado });
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 font-bold uppercase text-xs tracking-wider  ${
                  detalhe.arquivado
                    ? "bg-[oklch(0.55_0.16_75)] hover:bg-[oklch(0.65_0.14_75)] text-[#0e0f12]"
                    : "bg-zinc-600 hover:bg-zinc-700 text-white"
                }`}
              >
                {detalhe.arquivado ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                {detalhe.arquivado ? "Desarquivar" : "Arquivar"}
              </button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
