import { useBranding } from "@/hooks/use-branding";
import { useLojasCidade } from "./hooks/use-lojas-cidade";
import { useLojasFiltro } from "./hooks/use-lojas-filtro";
import { CidadeHero } from "./components/CidadeHero";
import { CategoriasFiltro } from "./components/CategoriasFiltro";
import { LojasList } from "./components/LojasList";
import { BottomNavCliente } from "./components/BottomNavCliente";

interface Props {
  cidade: string;
  uf?: string;
}

export function ClientesCidadePage({ cidade, uf }: Props) {
  const { logoUrl, nomeSistema } = useBranding();
  const { data: lojas = [], isLoading } = useLojasCidade(cidade, uf);
  const { busca, setBusca, categoriaFiltro, setCategoriaFiltro, filtradas } =
    useLojasFiltro(lojas);

  return (
    <div className="mp-splash min-h-screen pb-[calc(env(safe-area-inset-bottom)+5rem)]">
      <header className="mp-hero sticky top-0 z-30">
        <CidadeHero
          cidade={cidade}
          uf={uf}
          logoUrl={logoUrl}
          nomeSistema={nomeSistema}
          busca={busca}
          onBuscaChange={setBusca}
        />
        <CategoriasFiltro value={categoriaFiltro} onChange={setCategoriaFiltro} />
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-5">
        <LojasList lojas={filtradas} isLoading={isLoading} cidade={cidade} />
      </main>

      <BottomNavCliente cidade={cidade} uf={uf} />
    </div>
  );
}
