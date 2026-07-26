import { useMemo, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { agruparPorDia } from "../logic/helpers";
import type { PedidoHistorico } from "../logic/types";
import { EntregaRow } from "./EntregaRow";

const VIRTUALIZE_THRESHOLD = 30;
const ESTIMATED_ROW = 88;
const ESTIMATED_HEADER = 36;
const OVERSCAN = 6;
const PREVIEW_COUNT = 3;

type FlatItem =
  | { kind: "header"; label: string; key: string }
  | { kind: "row"; pedido: PedidoHistorico; key: string };

export function EntregasList({ listagem }: { listagem: PedidoHistorico[] }) {
  const [expandido, setExpandido] = useState(false);
  const groups = useMemo(() => agruparPorDia(listagem), [listagem]);

  const flat = useMemo<FlatItem[]>(() => {
    const out: FlatItem[] = [];
    for (const g of groups) {
      out.push({ kind: "header", label: g.label, key: `h:${g.label}` });
      for (const p of g.items) out.push({ kind: "row", pedido: p, key: p.id });
    }
    return out;
  }, [groups]);

  const podeExpandir = listagem.length > PREVIEW_COUNT;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-[15px] font-bold uppercase tracking-[0.04em] text-white">
          Entregas concluídas
        </span>
        <span
          className="text-[13px] font-bold uppercase tracking-[0.04em]"
          style={{ color: "#E01818" }}
        >
          {listagem.length} {listagem.length === 1 ? "registro" : "registros"}
        </span>
      </div>

      {!expandido ? (
        <div className="space-y-2.5">
          {listagem.slice(0, PREVIEW_COUNT).map((p) => (
            <EntregaRow key={p.id} pedido={p} />
          ))}
        </div>
      ) : flat.length <= VIRTUALIZE_THRESHOLD ? (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.label} className="space-y-2.5">
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/45 font-bold">
                {g.label}
              </div>
              {g.items.map((p) => (
                <EntregaRow key={p.id} pedido={p} />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <VirtualBody flat={flat} />
      )}

      {podeExpandir && (
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-[15px] font-bold"
          style={{ color: "#E01818" }}
        >
          {expandido ? "Ver menos" : "Ver todos os registros"}
          <ChevronRight className={`h-4 w-4 ${expandido ? "-rotate-90" : ""}`} />
        </button>
      )}
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
    <div ref={parentRef} className="overflow-y-auto" style={{ maxHeight: "calc(100dvh - 280px)" }}>
      <div style={{ height: virtualizer.getTotalSize(), width: "100%", position: "relative" }}>
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
                <div className="pt-4 pb-2 text-[11px] uppercase tracking-[0.2em] text-white/45 font-bold">
                  {item.label}
                </div>
              ) : (
                <div className="pb-2.5">
                  <EntregaRow pedido={item.pedido} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
