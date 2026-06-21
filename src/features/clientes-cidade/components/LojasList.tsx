import { Store } from "lucide-react";
import type { LojaPublica } from "../logic/types";
import { LojaCard } from "./LojaCard";

interface Props {
  lojas: LojaPublica[];
  isLoading: boolean;
  cidade: string;
}

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

  return (
    <section className="pb-6">
      <div className="flex items-center justify-between mb-1 px-1">
        <h2 className="font-display text-[22px] tracking-wide">Lojas</h2>
        <span className="mp-muted text-[11px] uppercase tracking-[0.16em]">
          {lojas.length} {lojas.length === 1 ? "loja" : "lojas"}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {lojas.map((l) => (
          <LojaCard key={l.id} loja={l} />
        ))}
      </div>
    </section>
  );
}
