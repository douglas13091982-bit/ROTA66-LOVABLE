import { Store } from "lucide-react";
import type { LojaPublica } from "../logic/types";
import { LojaCard } from "./LojaCard";
import { useFretesLojas } from "../hooks/use-fretes-lojas";

interface Props {
  lojas: LojaPublica[];
  isLoading: boolean;
  cidade: string;
}

export function LojasList({ lojas, isLoading, cidade }: Props) {
  const { fretes, temEndereco, carregando } = useFretesLojas(lojas);

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
      {!temEndereco && !carregando && (
        <p className="mp-muted text-[11px] px-1 mb-2">
          Cadastre seu endereço no perfil para ver o frete exato de cada loja.
        </p>
      )}
      <div className="flex flex-col divide-y divide-white/5">
        {lojas.map((l) => (
          <LojaCard
            key={l.id}
            loja={l}
            frete={fretes.get(l.id) ?? null}
            freteCarregando={carregando}
            semEndereco={!temEndereco}
          />
        ))}
      </div>
    </section>
  );
}
