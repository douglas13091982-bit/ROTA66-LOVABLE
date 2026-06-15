import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LojaShell } from "@/components/LojaShell";
import { useMinhaLoja } from "@/hooks/use-loja";
import { CatalogoHeader } from "./components/CatalogoHeader";
import { ProdutosListagem } from "./components/ProdutosListagem";
import { ProdutosToolbar } from "./components/ProdutosToolbar";
import { useProdutos } from "./hooks/use-produtos";
import { useViewMode } from "./hooks/use-view-mode";
import { filterProdutos } from "./logic/filter";

export function ProdutosPage() {
  const { data: loja } = useMinhaLoja();
  const qc = useQueryClient();
  const { view, setView } = useViewMode();
  const [search, setSearch] = useState("");
  const { data: produtos, isLoading } = useProdutos(loja?.id);

  if (!loja) {
    return (
      <LojaShell title="Catálogo">
        <p className="text-muted-foreground">Crie sua loja primeiro no Dashboard.</p>
      </LojaShell>
    );
  }

  const catalogoAtivo = (loja as any).catalogo_ativo === true;
  const catalogoUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/c/${(loja as any).catalogo_slug ?? loja.slug}`
      : "";
  const filtered = filterProdutos(produtos ?? [], search);
  const onChanged = () => qc.invalidateQueries({ queryKey: ["produtos", loja.id] });

  return (
    <LojaShell title="Catálogo">
      <CatalogoHeader lojaId={loja.id} catalogoAtivo={catalogoAtivo} catalogoUrl={catalogoUrl} />
      <ProdutosToolbar search={search} onSearch={setSearch} view={view} onViewChange={setView} />
      {isLoading && <p className="text-muted-foreground">Carregando...</p>}
      <ProdutosListagem
        produtos={filtered}
        view={view}
        lojaId={loja.id}
        onChanged={onChanged}
        searchActive={!!search.trim()}
        searchTerm={search.trim()}
        loading={isLoading}
      />
    </LojaShell>
  );
}
