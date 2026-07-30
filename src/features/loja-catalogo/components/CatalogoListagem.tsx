import { useMemo } from "react";
import { Bookmark, Search } from "lucide-react";
import type { Produto } from "@/routes/-catalogo-types";
import { ProdutoGrid } from "./ProdutoGrid";
import { CategoriaCarrossel } from "./CategoriaCarrossel";

type Props = {
  produtos: Produto[];
  produtosFiltrados: Produto[];
  categorias: string[];
  busca: string;
  isHorizontal: boolean;
  layout: "cards" | "lista";
  qtdByProduto: Record<string, number>;
  onAdd: (p: Produto) => void;
  onDec: (p: Produto) => void;
};

export function CatalogoListagem({
  produtos,
  produtosFiltrados,
  categorias,
  busca,
  isHorizontal,
  layout,
  qtdByProduto,
  onAdd,
  onDec,
}: Props) {
  const groups = useMemo(() => {
    const cats = categorias.length > 0 ? [...categorias, "Outros"] : ["Produtos"];
    return cats
      .map((cat) => {
        const items = produtos.filter((p) => {
          if (categorias.length === 0) return true;
          if (cat === "Outros") return !p.categoria;
          return p.categoria === cat;
        });
        return { cat, items };
      })
      .filter((g) => g.items.length > 0);
  }, [produtos, categorias]);

  if (produtosFiltrados.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
          <Search className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">
          {busca ? "Nenhum produto encontrado." : "Nenhum produto disponível no momento."}
        </p>
      </div>
    );
  }

  if (busca) {
    return (
      <ProdutoGrid
        items={produtosFiltrados}
        qtdByProduto={qtdByProduto}
        onAdd={onAdd}
        onDec={onDec}
        layout={layout}
      />
    );
  }

  return (
    <>
      {groups.map(({ cat, items }) => (
        <section key={cat} id={`cat-${cat}`} className={`${isHorizontal ? "mb-7" : "mb-8"} scroll-mt-44`}>
          <div className="flex items-center gap-2.5 mb-3 px-1">
            <span className="h-7 w-6 rounded-[4px] flex items-center justify-center shrink-0 bg-[var(--cc-gold)]">
              <Bookmark className="h-3.5 w-3.5 text-white fill-current" />
            </span>
            <h2 className={`cc-serif cc-ink-text ${isHorizontal ? "text-[22px]" : "text-[24px]"} leading-none`}>
              {cat}
            </h2>
            <div className="flex-1" />
            <span className="text-[12px] text-muted-foreground tabular-nums">{items.length} itens</span>
          </div>

          {isHorizontal ? (
            <CategoriaCarrossel items={items} qtdByProduto={qtdByProduto} onAdd={onAdd} onDec={onDec} />
          ) : (
            <ProdutoGrid items={items} qtdByProduto={qtdByProduto} onAdd={onAdd} onDec={onDec} layout={layout} />
          )}
        </section>
      ))}
    </>
  );
}
