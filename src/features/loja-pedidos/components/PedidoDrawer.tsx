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


  const podeAvancar =
    (detalhe.status === "novo" || detalhe.status === "aceito" || detalhe.status === "em_preparo") &&
    NEXT[detalhe.status];

  return (
    <Sheet open onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        className="panel-premium w-full sm:max-w-none sm:w-1/2 overflow-y-auto bg-[oklch(0.12_0.015_260)] border-l border-[oklch(0.78_0.16_75_/_0.35)] text-[var(--panel-text)]"
      >
        <SheetHeader className="pb-4 border-b border-[oklch(0.78_0.16_75_/_0.25)]">
          <SheetTitle className="pp-title-page text-3xl text-white flex items-center justify-between gap-3">
            <span>Pedido <span className="text-[var(--rota-gold)]">#{detalhe.numero}</span></span>
            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] rounded-full ${STATUS_COLOR[detalhe.status]}`}>
              {STATUS_LABEL[detalhe.status]}
            </span>
          </SheetTitle>
          <SheetDescription className="flex items-center gap-1.5 text-xs pp-eyebrow !tracking-[0.2em]">
            <Calendar className="h-3 w-3" />
            {formatDateTime(detalhe.created_at)}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 text-sm pp-reveal pt-5">
          <div className="pp-card p-4 space-y-2">
            <div className="pp-eyebrow">Cliente</div>
            <div className="flex items-center gap-2 text-[var(--panel-text)]"><User className="h-4 w-4 text-[var(--rota-gold)]" /> {detalhe.cliente_nome}</div>
            <div className="flex items-center gap-2 text-[var(--panel-text)]"><Phone className="h-4 w-4 text-[var(--rota-gold)]" /> {detalhe.cliente_telefone}</div>
          </div>

          <div className="pp-card p-4 space-y-2">
            <div className="pp-eyebrow">Endereço</div>
            <div className="flex items-start gap-2 text-[var(--panel-text)]">
              <MapPin className="h-4 w-4 mt-0.5 text-[var(--rota-gold)] shrink-0" />
              <span>
                {detalhe.endereco_entrega}
                {detalhe.complemento ? `, ${detalhe.complemento}` : ""}
              </span>
            </div>
          </div>

          {detalhe.observacoes && (
            <div className="pp-card p-4 space-y-2">
              <div className="pp-eyebrow">Observações</div>
              <div className="flex items-start gap-2 text-[var(--panel-text)]">
                <FileText className="h-4 w-4 mt-0.5 text-[var(--rota-gold)] shrink-0" />
                <span className="whitespace-pre-wrap">{detalhe.observacoes}</span>
              </div>
            </div>
          )}

          {Array.isArray(detalhe.itens) && detalhe.itens.length > 0 && (
            <div className="pp-card p-4 space-y-2">
              <div className="pp-eyebrow">Itens</div>
              <div className="rounded-lg divide-y divide-[oklch(0.78_0.16_75_/_0.15)] border border-[oklch(0.78_0.16_75_/_0.20)] overflow-hidden">
                {detalhe.itens.map((it: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-2 text-xs bg-[oklch(0.16_0.015_260_/_0.5)]">
                    <span className="truncate text-[var(--panel-text)]">
                      {it.quantidade ? `${it.quantidade}× ` : ""}{it.nome ?? it.descricao ?? "Item"}
                    </span>
                    {it.preco != null && (
                      <span className="pp-num text-sm text-[var(--rota-gold)]">R$ {Number(it.preco).toFixed(2)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pp-card p-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--panel-text-muted)]">Itens</span>
              <span className="pp-num text-[var(--panel-text)]">R$ {valorProdutos.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--panel-text-muted)]">Taxa de entrega</span>
              <span className="pp-num text-[var(--panel-text)]">R$ {taxa.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between pl-3 text-xs">
              <span className="text-[var(--panel-text-muted)]">↳ Taxa global (frete)</span>
              <span className="pp-num text-[var(--panel-text-muted)]">R$ {taxaGlobal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between pl-3 text-xs">
              <span className="text-[var(--panel-text-muted)]">↳ Taxa por pedido da loja</span>
              <span className="pp-num text-[var(--panel-text-muted)]">R$ {taxaPorPedido.toFixed(2)}</span>
            </div>
            {bonus > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[var(--panel-text-muted)]">Bônus ao entregador</span>
                <span className="pp-num text-[var(--rota-gold)]">+ R$ {bonus.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-3 mt-1 border-t border-[oklch(0.78_0.16_75_/_0.25)]">
              <span className="pp-eyebrow">Total</span>
              <span className="pp-num text-3xl" style={{ background: "var(--gradient-gold)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>R$ {Number(detalhe.valor_total).toFixed(2)}</span>
            </div>
          </div>

          {detalhe.entregador_id && (
            <EntregadorPixCard pedidoId={detalhe.id} pedidoNumero={detalhe.numero} />
          )}

          {detalhe.codigo_entrega && (
            <div className="pp-card p-4 space-y-3">
              <div className="pp-eyebrow">Rastreio do cliente</div>
              <div className="flex items-center gap-2 text-xs">
                <span className="pp-num font-mono bg-[oklch(0.16_0.015_260_/_0.6)] rounded px-2.5 py-1 border border-[oklch(0.78_0.16_75_/_0.35)] text-[var(--rota-gold)] tracking-widest">{detalhe.codigo_entrega}</span>
                <span className="text-[var(--panel-text-muted)]">código de confirmação</span>
              </div>
              <a
                href={`${window.location.origin}/rastreio/${detalhe.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[var(--rota-gold)] hover:underline"
              >
                <MapPin className="h-3 w-3" /> Abrir link de rastreio
              </a>
              <button
                onClick={() => actions.abrirWhatsAppRastreio(detalhe)}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-[oklch(0.55_0.26_25)] hover:bg-[oklch(0.48_0.24_25)] text-white font-semibold uppercase text-xs tracking-[0.15em] rounded-lg"
              >
                <MessageCircle className="h-4 w-4" /> Rastreio pelo WhatsApp
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={() => imprimirPedido(detalhe as any, lojaNome ?? undefined)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[oklch(0.20_0.02_260)] hover:bg-[oklch(0.24_0.02_260)] text-[var(--panel-text)] border border-[oklch(0.78_0.16_75_/_0.25)] font-semibold uppercase text-xs tracking-[0.15em] rounded-lg"
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
                  if (window.confirm(`Cancelar pedido #${detalhe.numero}?`)) {
                    actions.cancelarPedido(detalhe.id);
                    onUpdateDetalhe({ ...detalhe, status: "cancelado" });
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold uppercase text-xs tracking-wider rounded-md"
              >
                <X className="h-3.5 w-3.5" /> Cancelar pedido
              </button>
            )}
            {detalhe.status === "entregue" && (
              <button
                onClick={() => {
                  actions.toggleArquivado(detalhe.id, detalhe.arquivado);
                  onUpdateDetalhe({ ...detalhe, arquivado: !detalhe.arquivado });
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 font-bold uppercase text-xs tracking-wider rounded-md ${
                  detalhe.arquivado
                    ? "bg-[oklch(0.55_0.16_75)] hover:bg-[oklch(0.65_0.14_75)] text-[#0e0f12]"
                    : "bg-zinc-600 hover:bg-zinc-700 text-white"
                }`}
              >
                {detalhe.arquivado ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                {detalhe.arquivado ? "Desarquivar" : "Arquivar"}
              </button>
            )}
            {detalhe.status === "em_rota" && (
              <button
                onClick={() => {
                  onConfirmarColeta(detalhe);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[oklch(0.40_0.06_265)] hover:bg-[oklch(0.45_0.06_265)] text-white font-bold uppercase text-xs tracking-wider rounded-md"
              >
                <KeyRound className="h-3.5 w-3.5" /> Confirmar coleta
              </button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
