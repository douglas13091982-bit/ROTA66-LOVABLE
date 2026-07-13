import type { Produto } from "@/routes/-catalogo-types";
import { AddButton, QtyStepper } from "./QtyStepper";

type Props = {
  items: Produto[];
  qtdByProduto: Record<string, number>;
  onAdd: (p: Produto) => void;
  onDec: (p: Produto) => void;
  layout: "cards" | "lista";
};

function hasAdicionais(p: Produto) {
  return (p.adicionais_grupos ?? []).some((g) => g.opcoes.length > 0);
}

export function ProdutoGrid({ items, qtdByProduto, onAdd, onDec, layout }: Props) {
  const renderControls = (p: Produto) => {
    const qtd = qtdByProduto[p.id] ?? 0;
    if (hasAdicionais(p)) {
      return (
        <div className="flex items-center gap-2">
          {qtd > 0 && (
            <span className="text-[11px] font-bold text-primary tabular-nums">{qtd}×</span>
          )}
          <AddButton onAdd={() => onAdd(p)} />
        </div>
      );
    }
    return qtd > 0 ? (
      <QtyStepper qtd={qtd} onAdd={() => onAdd(p)} onRemove={() => onDec(p)} />
    ) : (
      <AddButton onAdd={() => onAdd(p)} />
    );
  };

  if (layout === "lista") {
    return (
      <div className="space-y-0 cc-card rounded-2xl px-3.5">
        {items.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center gap-3.5 py-3.5 ${i !== items.length - 1 ? "border-b border-border/70" : ""}`}
          >
            <div className="cc-img-wrap h-16 w-16 rounded-xl shrink-0">
              {p.imagem_url ? (
                <img src={p.imagem_url} alt={p.nome} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">sem foto</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-[15px] leading-tight tracking-tight text-foreground truncate">{p.nome}</h3>
              {p.descricao && <p className="text-[12px] text-muted-foreground line-clamp-1 mt-0.5">{p.descricao}</p>}
              <span className="cc-price text-[16px] text-primary leading-none mt-1 inline-block">R$ {Number(p.preco).toFixed(2)}</span>
            </div>
            <div className="shrink-0">{renderControls(p)}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map((p) => (
        <article key={p.id} className="cc-card rounded-2xl p-3 flex gap-3 group">
          <div className="cc-img-wrap h-24 w-24 sm:h-[88px] sm:w-[88px] rounded-xl shrink-0">
            {p.imagem_url ? (
              <img src={p.imagem_url} alt={p.nome} loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">sem foto</div>
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <h3 className="font-display text-[15px] leading-tight tracking-tight text-foreground line-clamp-1">{p.nome}</h3>
            {p.descricao && <p className="text-[12px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">{p.descricao}</p>}
            <div className="mt-auto pt-2 flex items-center justify-between gap-2">
              <span className="cc-price text-[18px] text-primary leading-none">R$ {Number(p.preco).toFixed(2)}</span>
              {renderControls(p)}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
