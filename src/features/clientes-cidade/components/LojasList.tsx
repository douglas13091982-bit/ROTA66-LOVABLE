import { useMemo, useState } from "react";
import { Store } from "lucide-react";
import type { LojaPublica } from "../logic/types";
import { LojaCard } from "./LojaCard";
import { useFretesLojas } from "../hooks/use-fretes-lojas";
import { useAvaliacoesLojas } from "../hooks/use-avaliacoes-lojas";

interface Props {
  lojas: LojaPublica[];
  isLoading: boolean;
  cidade: string;
}

type Ordem = "padrao" | "mais_avaliadas" | "melhor_nota";

const OPCOES: { value: Ordem; label: string }[] = [
  { value: "padrao", label: "Padrão" },
  { value: "melhor_nota", label: "Melhor nota" },
  { value: "mais_avaliadas", label: "Mais avaliadas" },
];

export function LojasList({ lojas, isLoading, cidade }: Props) {
  const { fretes, temEndereco, carregando } = useFretesLojas(lojas);
  const avaliacoes = useAvaliacoesLojas(lojas.map((l) => l.id));
  const [ordem, setOrdem] = useState<Ordem>("padrao");

  const lojasOrdenadas = useMemo(() => {
    if (ordem === "padrao") return lojas;
    const copy = [...lojas];
    if (ordem === "mais_avaliadas") {
      copy.sort((a, b) => {
        const ta = avaliacoes.get(a.id)?.total ?? 0;
        const tb = avaliacoes.get(b.id)?.total ?? 0;
        return tb - ta;
      });
    } else if (ordem === "melhor_nota") {
      copy.sort((a, b) => {
        const ra = avaliacoes.get(a.id);
        const rb = avaliacoes.get(b.id);
        const ma = ra && ra.total > 0 ? ra.media : 5;
        const mb = rb && rb.total > 0 ? rb.media : 5;
        if (mb !== ma) return mb - ma;
        return (rb?.total ?? 0) - (ra?.total ?? 0);
      });
    }
    return copy;
  }, [lojas, avaliacoes, ordem]);

  if (isLoading) {
    return <div className="text-center mp-muted py-16 text-sm">Carregando lojas...</div>;
  }
  if (lojas.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-[rgba(13,44,84,0.06)] flex items-center justify-center mb-3">
          <Store className="h-6 w-6 mp-muted" />
        </div>
        <p className="mp-muted text-sm">Nenhuma loja encontrada em {cidade}.</p>
      </div>
    );
  }

  return (
    <section className="pb-6">
      <div className="border-t border-[rgba(15,37,66,0.12)] pt-4 mb-3 flex items-center justify-between px-1">
        <h2 className="mp-serif text-[15px] uppercase tracking-[0.16em]">
          Restaurantes em destaque
        </h2>
        <span className="mp-serif mp-gold text-[14px]">
          {lojas.length} {lojas.length === 1 ? "loja" : "lojas"}
        </span>
      </div>
      <div className="flex items-center gap-2 px-1 mb-3 overflow-x-auto">
        {OPCOES.map((op) => {
          const ativo = ordem === op.value;
          return (
            <button
              key={op.value}
              type="button"
              onClick={() => setOrdem(op.value)}
              className={`mp-serif px-3 py-1 text-[13px] border whitespace-nowrap transition ${
                ativo ? "mp-chip mp-chip-active" : "mp-chip"
              }`}
            >
              {op.label}
            </button>
          );
        })}
      </div>

      {!temEndereco && !carregando && (
        <p className="mp-muted text-[11px] px-1 mb-2">
          Cadastre seu endereço no perfil para ver o frete exato de cada loja.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {lojasOrdenadas.map((l) => (
          <LojaCard
            key={l.id}
            loja={l}
            frete={fretes.get(l.id) ?? null}
            freteCarregando={carregando}
            semEndereco={!temEndereco}
            avaliacao={avaliacoes.get(l.id) ?? null}
          />
        ))}
      </div>
    </section>
  );
}
