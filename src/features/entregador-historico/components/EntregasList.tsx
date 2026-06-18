import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { agruparPorDia } from "../logic/helpers";
import type { PedidoHistorico } from "../logic/types";
import { EntregaRow } from "./EntregaRow";

const VIRTUALIZE_THRESHOLD = 30;
const ESTIMATED_ROW = 88;
const ESTIMATED_HEADER = 36;
const OVERSCAN = 6;

type FlatItem =
  | { kind: "header"; label: string; key: string }
  | { kind: "row"; pedido: PedidoHistorico; key: string };

export function EntregasList({ listagem }: { listagem: PedidoHistorico[] }) {
  const groups = useMemo(() => agruparPorDia(listagem), [listagem]);

  const flat = useMemo<FlatItem[]>(() => {
    const out: FlatItem[] = [];
    for (const g of groups) {
      out.push({ kind: "header", label: g.label, key: `h:${g.label}` });
      for (const p of g.items) out.push({ kind: "row", pedido: p, key: p.id });
    }
    return out;
  }, [groups]);

  const header = (
    <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
      <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-bold">
        Entregas concluídas
      </span>
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {listagem.length} {listagem.length === 1 ? "registro" : "registros"}
      </span>
    </div>
  );

  if (flat.length <= VIRTUALIZE_THRESHOLD) {
    return (
      <div className="overflow-hidden">
        {header}
        {groups.map((g) => (
          <div key={g.label}>
            <div className="px-4 pt-4 pb-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-bold">
              {g.label}
            </div>
            {g.items.map((p) => (
              <EntregaRow key={p.id} pedido={p} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {header}
      <VirtualBody flat={flat} />
    </div>
  );
}

function VirtualBody({ flat }: { flat: FlatItem[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: flat.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => (flat[i].kind === "header" ? ESTIMATED_HEADER : ESTIMATED_ROW),
    overscan: OVERSCAN,
    getItemKey: (i) => flat[i].key,
  });

  return (
    <div
      ref={parentRef}
      className="overflow-y-auto"
      style={{ maxHeight: "calc(100dvh - 240px)" }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((vi) => {
          const item = flat[vi.index];
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
                transform: `translateY(${vi.start}px)`,
              }}
            >
              {item.kind === "header" ? (
                <div className="px-4 pt-4 pb-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-bold">
                  {item.label}
                </div>
              ) : (
                <EntregaRow pedido={item.pedido} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
