import { SlidersHorizontal } from "lucide-react";
import { LOJA_CATEGORIAS } from "@/lib/loja-categorias";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function CategoriasFiltro({ value, onChange }: Props) {
  if (LOJA_CATEGORIAS.length === 0) return null;
  return (
    <div className="max-w-2xl mx-auto pb-3.5 pt-1 relative bg-background/0">
      <div className="flex gap-2 overflow-x-auto cc-scroll-x px-4 pb-1 snap-x scroll-smooth">
        <button
          onClick={() => onChange("")}
          className={`shrink-0 snap-start px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] rounded-full whitespace-nowrap ${value === "" ? "cc-chip-active" : "cc-chip"}`}
        >
          <span className="inline-flex items-center gap-1.5">
            <SlidersHorizontal className="h-3 w-3" /> Todas
          </span>
        </button>
        {LOJA_CATEGORIAS.map((c) => (
          <button
            key={c.value}
            onClick={() => onChange(c.value)}
            className={`shrink-0 snap-start px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] rounded-full whitespace-nowrap ${value === c.value ? "cc-chip-active" : "cc-chip"}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="pointer-events-none absolute top-0 right-0 h-full w-10 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}
