import { Store } from "lucide-react";
import type { LojaPublica } from "../logic/types";
import { LojaCard } from "./LojaCard";
import { labelCategoria, LOJA_CATEGORIAS } from "@/lib/loja-categorias";

interface Props {
  lojas: LojaPublica[];
  isLoading: boolean;
  cidade: string;
}

const ORDEM = LOJA_CATEGORIAS.map((c) => c.value) as string[];

export function LojasList({ lojas, isLoading, cidade }: Props) {
  if (isLoading) {
    return <div className="text-center mp-muted py-16 text-sm">Carregando lojas...</div>;
  }
  if (lojas.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
          <Store className="h-6 w-6 mp-muted" />
        </div>
        <p className="mp-muted text-sm">Nenhuma loja encontrada em {cidade}.</p>
      </div>
    );
  }

  // Agrupar por categoria
  const grupos = new Map<string, LojaPublica[]>();
  for (const l of lojas) {
    const key = l.categoria ?? "outros";
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(l);
  }

  const chaves = Array.from(grupos.keys()).sort((a, b) => {
    const ia = ORDEM.indexOf(a);
    const ib = ORDEM.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  return (
    <div className="space-y-7 pb-4">
      {chaves.map((cat) => {
        const items = grupos.get(cat)!;
        return (
          <section key={cat}>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <h2 className="mp-card-title text-[12px] font-semibold uppercase tracking-[0.18em]">
                {labelCategoria(cat)}
              </h2>
              <span className="mp-muted text-[10px] uppercase tracking-[0.16em]">
                {items.length} {items.length === 1 ? "loja" : "lojas"}
              </span>
            </div>
            <div
              className="flex gap-3 overflow-x-auto snap-x scroll-smooth -mx-4 px-4 pb-2"
              style={{ scrollbarWidth: "none" }}
            >
              {items.map((l) => (
                <div key={l.id} className="snap-start shrink-0 w-[240px]">
                  <LojaCard loja={l} />
                </div>
              ))}

            </div>
          </section>
        );
      })}
    </div>
  );
}
