import { precoEfetivo, promoAtiva, type Produto } from "@/routes/-catalogo-types";
import { AddButton, QtyStepper } from "./QtyStepper";
import { formatCurrencyValue } from "@/lib/format";

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
          {qtd > 0 && <span className="text-[12px] font-bold text-primary tabular-nums">{qtd}×</span>}
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

  const preco = (p: Produto) =>
    promoAtiva(p) ? (
      <span className="inline-flex items-baseline gap-2">
        <span className="cc-price text-[19px] text-primary leading-none">
          R$ {formatCurrencyValue(precoEfetivo(p))}
        </span>
        <span className="text-[12px] text-muted-foreground line-through">
          R$ {formatCurrencyValue(Number(p.preco))}
        </span>
      </span>
    ) : (
      <span className="cc-price text-[19px] text-primary leading-none">
        R$ {formatCurrencyValue(Number(p.preco))}
      </span>
    );

  if (layout === "lista") {
    return (
      <div className="cc-card rounded-2xl px-4 grid grid-cols-1 md:grid-cols-2 gap-x-6">
        {items.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center gap-3.5 py-4 ${i !== items.length - 1 ? "border-b border-border" : ""}`}
          >
            <div className="cc-img-wrap h-[68px] w-[68px] rounded-xl shrink-0">
              {p.imagem_url ? (
                <img src={p.imagem_url} alt={p.nome} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">
                  sem foto
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="cc-serif cc-ink-text text-[17px] leading-tight truncate">{p.nome}</h3>
              {p.descricao && (
                <p className="text-[13px] text-muted-foreground line-clamp-1 mt-0.5">{p.descricao}</p>
              )}
              <div className="mt-1">{preco(p)}</div>
            </div>
            <div className="shrink-0">{renderControls(p)}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {items.map((p) => (
        <article key={p.id} className="cc-card rounded-2xl p-3 flex items-center gap-3.5 h-full">
          <div className="cc-img-wrap h-[92px] w-[92px] rounded-xl shrink-0 relative">
            {p.imagem_url ? (
              <img src={p.imagem_url} alt={p.nome} loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">
                sem foto
              </div>
            )}
            {promoAtiva(p) && (
              <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-primary text-white text-[9px] font-bold uppercase tracking-[0.12em]">
                Promo
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="cc-serif cc-ink-text text-[19px] leading-tight line-clamp-2">{p.nome}</h3>
            {p.descricao && (
              <p className="text-[13px] text-muted-foreground line-clamp-2 mt-1 leading-snug">{p.descricao}</p>
            )}
            <div className="mt-1.5">{preco(p)}</div>
          </div>
          <div className="shrink-0 self-end pb-1">{renderControls(p)}</div>
        </article>
      ))}
    </div>
  );
}
