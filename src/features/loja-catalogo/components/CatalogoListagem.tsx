import { useMemo } from "react";
import { Search } from "lucide-react";
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
  cart: Record<string, number>;
  addItem: (id: string) => void;
  removeItem: (id: string) => void;
};

export function CatalogoListagem({
  produtos,
  produtosFiltrados,
  categorias,
  busca,
  isHorizontal,
  layout,
  cart,
  addItem,
  removeItem,
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
    return <ProdutoGrid items={produtosFiltrados} cart={cart} addItem={addItem} removeItem={removeItem} layout={layout} />;
  }

  return (
    <>
      {groups.map(({ cat, items }) => (
        <section key={cat} id={`cat-${cat}`} className={`${isHorizontal ? "mb-7" : "mb-8"} scroll-mt-44`}>
          <div className="flex items-center gap-3 mb-3 px-1">
            <h2 className={`font-display ${isHorizontal ? "text-[20px]" : "text-[22px]"} cc-ink-text`}>{cat}</h2>
            <div className="flex-1 cc-divider-gold" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground tabular-nums">
              {items.length} itens
            </span>
          </div>
          {isHorizontal ? (
            <CategoriaCarrossel items={items} cart={cart} addItem={addItem} removeItem={removeItem} />
          ) : (
            <ProdutoGrid items={items} cart={cart} addItem={addItem} removeItem={removeItem} layout={layout} />
          )}
        </section>
      ))}
    </>
  );
}
