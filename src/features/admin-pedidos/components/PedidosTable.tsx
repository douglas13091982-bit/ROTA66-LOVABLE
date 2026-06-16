import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { PedidoRow as PedidoRowType } from "../logic/types";
import { PedidoRow } from "./PedidoRow";

const VIRTUALIZE_THRESHOLD = 40;
const ESTIMATED_ROW = 64;
const OVERSCAN = 8;

export function PedidosTable({ pedidos }: { pedidos: PedidoRowType[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualize = pedidos.length > VIRTUALIZE_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: pedidos.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW,
    overscan: OVERSCAN,
    getItemKey: (i) => pedidos[i].id,
    enabled: virtualize,
  });

  if (!virtualize) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-card overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <Header />
          <tbody>
            {pedidos.map((p) => (
              <PedidoRow key={p.id} pedido={p} />
            ))}
            {pedidos.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  Nenhum pedido ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  const items = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = items.length > 0 ? items[0].start : 0;
  const paddingBottom = items.length > 0 ? totalSize - items[items.length - 1].end : 0;

  return (
    <div
      ref={parentRef}
      className="bg-card border border-border rounded-lg shadow-card overflow-auto"
      style={{ maxHeight: "calc(100dvh - 220px)" }}
    >
      <table className="w-full min-w-[800px]">
        <Header />
        <tbody>
          {paddingTop > 0 && (
            <tr style={{ height: paddingTop }} aria-hidden="true">
              <td colSpan={7} />
            </tr>
          )}
          {items.map((vi) => {
            const p = pedidos[vi.index];
            return (
              <PedidoRow
                key={p.id}
                pedido={p}
                // measureElement precisa de um nó com data-index;
                // PedidoRow já é um <tr>, então não envolvemos.
              />
            );
          })}
          {paddingBottom > 0 && (
            <tr style={{ height: paddingBottom }} aria-hidden="true">
              <td colSpan={7} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Header() {
  return (
    <thead className="bg-background sticky top-0 z-10">
      <tr className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <th className="text-left p-4">#</th>
        <th className="text-left p-4">Loja</th>
        <th className="text-left p-4">Cliente</th>
        <th className="text-left p-4">Total</th>
        <th className="text-left p-4">Entregador</th>
        <th className="text-left p-4">Status</th>
        <th className="text-left p-4">Data</th>
      </tr>
    </thead>
  );
}
