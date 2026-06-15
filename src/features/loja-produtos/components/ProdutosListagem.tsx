import type { Produto, ViewMode } from "../logic/types";
import { ProdutoCard } from "./ProdutoCard";
import { ProdutoLinha } from "./ProdutoLinha";

export function ProdutosListagem({
  produtos,
  view,
  lojaId,
  onChanged,
  searchActive,
  searchTerm,
  loading,
}: {
  produtos: Produto[];
  view: ViewMode;
  lojaId: string;
  onChanged: () => void;
  searchActive: boolean;
  searchTerm: string;
  loading: boolean;
}) {
  if (!loading && produtos.length === 0 && searchActive) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Nenhum produto encontrado para "{searchTerm}".
      </p>
    );
  }

  if (view === "cards") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {produtos.map((p) => (
          <ProdutoCard key={p.id} produto={p} lojaId={lojaId} onChanged={onChanged} />
        ))}
        {!loading && produtos.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-8">
            Nenhum produto cadastrado ainda.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden divide-y divide-border">
      {produtos.map((p) => (
        <ProdutoLinha key={p.id} produto={p} lojaId={lojaId} onChanged={onChanged} />
      ))}
      {!loading && produtos.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Nenhum produto cadastrado ainda.</p>
      )}
    </div>
  );
}
