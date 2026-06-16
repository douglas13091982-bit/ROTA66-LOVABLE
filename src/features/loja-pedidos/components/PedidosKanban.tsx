import { COLUMNS, NEXT, lojaControlaStatus } from "../logic/constants";
import type { LoteEmPreparo } from "../logic/agrupador";
import type { Pedido } from "../hooks/use-pedidos-loja";
import type { PedidoActions } from "../hooks/use-pedido-actions";
import { PedidoCard } from "./PedidoCard";
import { LoteEmPreparoCard } from "./LoteEmPreparoCard";
import { Package } from "lucide-react";
import { toast } from "sonner";
import { useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

const COLUMN_VIRTUALIZE_THRESHOLD = 200;
const ESTIMATED_CARD = 168;
const OVERSCAN = 10;

interface Props {
  pedidos: Pedido[];
  grouped: Record<string, Pedido[]>;
  lotesEmPreparo: LoteEmPreparo[];
  actions: PedidoActions;
  onOpenDetalhe: (p: Pedido) => void;
  onConfirmarColeta: (p: Pedido) => void;
}

function resolveTargetStatus(currentStatus: string, targetStatuses: string[]): string | null {
  let next: string | null = NEXT[currentStatus];
  const visited = new Set<string>();
  while (next && !visited.has(next)) {
    visited.add(next);
    if (targetStatuses.includes(next)) return next;
    next = NEXT[next];
  }
  return null;
}

export function PedidosKanban({
  pedidos,
  grouped,
  lotesEmPreparo,
  actions,
  onOpenDetalhe,
  onConfirmarColeta,
}: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const handleDrop = (colKey: string) => {
    setDragOver(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const pedido = pedidos.find((p) => p.id === id);
    if (!pedido) return;
    if (!lojaControlaStatus(pedido.status)) {
      toast.error("Esse pedido é atualizado pelo app do entregador.");
      return;
    }
    const targetCol = COLUMNS.find((c) => c.key === colKey);
    if (!targetCol) return;
    const currentCol = COLUMNS.find((c) => c.statuses.includes(pedido.status));
    if (!currentCol || currentCol.key === targetCol.key) return;

    const finalStatus = resolveTargetStatus(pedido.status, targetCol.statuses);
    if (!finalStatus) {
      toast.error("Mova para a próxima coluna do fluxo.");
      return;
    }
    actions.updateStatus(id, finalStatus);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {COLUMNS.map((col) => {
        const items = grouped[col.key] ?? [];
        const isOver = dragOver === col.key;
        const lotes = col.key === "preparacao" ? lotesEmPreparo : [];
        return (
          <div
            key={col.key}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(col.key);
            }}
            onDragLeave={() => setDragOver((v) => (v === col.key ? null : v))}
            onDrop={() => handleDrop(col.key)}
            className={`bg-muted/30 border rounded-lg border-t-4 ${col.accent} flex flex-col min-h-[200px] transition-colors ${
              isOver ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <div className="px-3 py-2 flex items-center justify-between border-b border-border">
              <h3 className="font-display text-base tracking-wide">{col.title}</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-background border border-border rounded-full px-2 py-0.5">
                {items.length}
              </span>
            </div>
            <ColumnBody
              items={items}
              lotes={lotes}
              dragId={dragId}
              setDragId={setDragId}
              setDragOver={setDragOver}
              actions={actions}
              onOpenDetalhe={onOpenDetalhe}
              onConfirmarColeta={onConfirmarColeta}
            />
          </div>
        );
      })}
    </div>
  );
}

interface ColumnBodyProps {
  items: Pedido[];
  lotes: LoteEmPreparo[];
  dragId: string | null;
  setDragId: (id: string | null) => void;
  setDragOver: (k: string | null) => void;
  actions: PedidoActions;
  onOpenDetalhe: (p: Pedido) => void;
  onConfirmarColeta: (p: Pedido) => void;
}

function ColumnBody(props: ColumnBodyProps) {
  const { items, lotes, dragId, setDragId, setDragOver, actions, onOpenDetalhe, onConfirmarColeta } = props;
  const virtualize = items.length > COLUMN_VIRTUALIZE_THRESHOLD;

  // Render padrão: comportamento idêntico ao original.
  if (!virtualize) {
    return (
      <div className="p-2 space-y-2 flex-1">
        {lotes.map((lote) => (
          <LoteEmPreparoCard
            key={`lote-${lote.key}`}
            lote={lote}
            onMarcarTodosProntos={actions.marcarLoteComoPronto}
          />
        ))}
        {items.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-4">Vazio</p>
        )}
        {items.map((p) => (
          <PedidoCard
            key={p.id}
            pedido={p}
            dragId={dragId}
            onDragStart={setDragId}
            onDragEnd={() => {
              setDragId(null);
              setDragOver(null);
            }}
            onOpenDetalhe={onOpenDetalhe}
            onConfirmarColeta={onConfirmarColeta}
            onToggleArquivado={actions.toggleArquivado}
            onAbrirWhatsApp={actions.abrirWhatsAppRastreio}
          />
        ))}
      </div>
    );
  }

  return (
    <VirtualizedColumn
      items={items}
      lotes={lotes}
      dragId={dragId}
      setDragId={setDragId}
      setDragOver={setDragOver}
      actions={actions}
      onOpenDetalhe={onOpenDetalhe}
      onConfirmarColeta={onConfirmarColeta}
    />
  );
}

function VirtualizedColumn(props: ColumnBodyProps) {
  const { items, lotes, dragId, setDragId, setDragOver, actions, onOpenDetalhe, onConfirmarColeta } = props;
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_CARD,
    overscan: OVERSCAN,
    getItemKey: (i) => items[i].id,
  });

  const vItems = virtualizer.getVirtualItems();
  // Mantém o cartão sendo arrastado sempre no DOM, mesmo se sair do viewport
  // — garantia para o HTML5 drag-and-drop não cancelar no meio do movimento.
  const draggingIndex = dragId ? items.findIndex((p) => p.id === dragId) : -1;
  const draggingInWindow = vItems.some((vi) => vi.index === draggingIndex);

  return (
    <div className="p-2 flex-1 flex flex-col gap-2">
      {/* Lotes ficam fora da janela virtualizada (lista pequena, sempre visível). */}
      {lotes.map((lote) => (
        <LoteEmPreparoCard
          key={`lote-${lote.key}`}
          lote={lote}
          onMarcarTodosProntos={actions.marcarLoteComoPronto}
        />
      ))}

      <div
        ref={parentRef}
        className="overflow-y-auto"
        // Janela própria de rolagem é requisito da virtualização.
        // Mantém a coluna utilizável dentro do grid do Kanban.
        style={{ maxHeight: "calc(100dvh - 260px)", minHeight: 240 }}
      >
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: "100%",
            position: "relative",
          }}
        >
          {vItems.map((vi) => {
            const p = items[vi.index];
            return (
              <div
                key={vi.key}
                ref={virtualizer.measureElement}
                data-index={vi.index}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  paddingBottom: 8,
                  transform: `translateY(${vi.start}px)`,
                }}
              >
                <PedidoCard
                  pedido={p}
                  dragId={dragId}
                  onDragStart={setDragId}
                  onDragEnd={() => {
                    setDragId(null);
                    setDragOver(null);
                  }}
                  onOpenDetalhe={onOpenDetalhe}
                  onConfirmarColeta={onConfirmarColeta}
                  onToggleArquivado={actions.toggleArquivado}
                  onAbrirWhatsApp={actions.abrirWhatsAppRastreio}
                />
              </div>
            );
          })}

          {/* Cartão arrastado fora da janela: renderiza oculto para não cancelar o drag. */}
          {dragId && draggingIndex >= 0 && !draggingInWindow && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                opacity: 0,
                pointerEvents: "none",
                transform: `translateY(${draggingIndex * ESTIMATED_CARD}px)`,
              }}
            >
              <PedidoCard
                pedido={items[draggingIndex]}
                dragId={dragId}
                onDragStart={setDragId}
                onDragEnd={() => {
                  setDragId(null);
                  setDragOver(null);
                }}
                onOpenDetalhe={onOpenDetalhe}
                onConfirmarColeta={onConfirmarColeta}
                onToggleArquivado={actions.toggleArquivado}
                onAbrirWhatsApp={actions.abrirWhatsAppRastreio}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PedidosVazio() {
  return (
    <div className="bg-card border border-border rounded-lg p-12 text-center shadow-card">
      <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
      <p className="font-display text-2xl tracking-wide mb-2">Nenhum pedido ainda</p>
      <p className="text-muted-foreground text-sm">
        Os pedidos do seu cardápio aparecerão aqui em tempo real.
      </p>
    </div>
  );
}
