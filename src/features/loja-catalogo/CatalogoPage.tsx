import { useMemo, useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { pageWrapper } from "@/routes/-catalogo-types";
import { lojaAbertaAgora } from "@/lib/horario-funcionamento";
import { useCart } from "./hooks/use-cart";
import { useCatalogoConfig, useLojaPublica, useProdutosCatalogo } from "./hooks/use-catalogo";
import { CatalogoHeader } from "./components/CatalogoHeader";
import { CatalogoIndisponivel } from "./components/CatalogoIndisponivel";
import { LojaFechadaBanner } from "./components/LojaFechadaBanner";
import { CatalogoListagem } from "./components/CatalogoListagem";
import { CheckoutDialog } from "./components/CheckoutDialog";
import { PedidoSucesso } from "./components/PedidoSucesso";
import { StickyCartBar } from "./components/StickyCartBar";

export function CatalogoPage({ slug }: { slug: string }) {
  const [showCheckout, setShowCheckout] = useState(false);
  const [sucesso, setSucesso] = useState<{ id: string; numero: number } | null>(null);
  const [busca, setBusca] = useState("");
  const [catAtiva, setCatAtiva] = useState("");

  const { data: loja, isLoading: loadingLoja } = useLojaPublica(slug);
  const catalogoAtivo = !!loja && (loja as any).catalogo_ativo === true;
  const horario = (loja as any)?.horario_funcionamento ?? null;
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const lojaFechada = !!loja && !lojaAbertaAgora(horario, agora);
  const { data: produtos } = useProdutosCatalogo(loja?.id, catalogoAtivo);
  const { data: catalogoConfig } = useCatalogoConfig();

  const { cart, clear, addItem, removeItem, cartItems, subtotal, totalItens } = useCart(produtos);

  const addItemGuarded = useCallback(
    (id: string) => {
      if (lojaFechada) {
        toast.error("Loja fechada — não é possível adicionar itens no momento.");
        return;
      }
      addItem(id);
    },
    [addItem, lojaFechada],
  );

  const categorias = useMemo(() => {
    const set = new Set<string>();
    (produtos ?? []).forEach((p) => p.categoria && set.add(p.categoria));
    return Array.from(set);
  }, [produtos]);

  const minProdutos = catalogoConfig?.catalogo_horizontal_min_produtos ?? 50;
  const minCategorias = catalogoConfig?.catalogo_horizontal_min_categorias ?? 5;
  const isHorizontal = (produtos ?? []).length >= minProdutos && categorias.length >= minCategorias;

  const produtosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const list = produtos ?? [];
    if (!q) return list;
    return list.filter(
      (p) => p.nome.toLowerCase().includes(q) || (p.descricao ?? "").toLowerCase().includes(q),
    );
  }, [produtos, busca]);

  if (loadingLoja) {
    return (
      <div className="catalogo-clean min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!loja || !catalogoAtivo || loja.status !== "aprovado") {
    return <CatalogoIndisponivel />;
  }

  if (sucesso) {
    return (
      <PedidoSucesso
        pedido={sucesso}
        onVoltar={() => {
          setSucesso(null);
          clear();
        }}
      />
    );
  }

  const taxaBase = Number(loja.taxa_entrega_base) || 0;
  const layout = ((loja as any).catalogo_layout ?? "cards") as "cards" | "lista";
  

  return (
    <div className={pageWrapper}>
      <CatalogoHeader
        loja={loja}
        busca={busca}
        setBusca={setBusca}
        categorias={categorias}
        catAtiva={catAtiva}
        setCatAtiva={setCatAtiva}
      />

      {lojaFechada && <LojaFechadaBanner horario={horario} />}

      <main className="max-w-2xl mx-auto px-4 pt-5">
        <CatalogoListagem
          produtos={produtos ?? []}
          produtosFiltrados={produtosFiltrados}
          categorias={categorias}
          busca={busca}
          isHorizontal={isHorizontal}
          layout={layout}
          cart={cart}
          addItem={addItemGuarded}
          removeItem={removeItem}
        />
      </main>

      {!lojaFechada && !showCheckout && (
        <StickyCartBar totalItens={totalItens} subtotal={subtotal} onOpen={() => setShowCheckout(true)} />
      )}

      {!lojaFechada && showCheckout && (
        <CheckoutDialog
          slug={slug}
          lojaId={loja.id}
          lojaCoords={{ lat: (loja as any).endereco_lat ?? null, lng: (loja as any).endereco_lng ?? null }}
          taxaBase={taxaBase}
          cartItems={cartItems}
          subtotal={subtotal}
          onClose={() => setShowCheckout(false)}
          onSuccess={(r) => {
            setShowCheckout(false);
            setSucesso(r);
          }}
          addItem={addItemGuarded}
          removeItem={removeItem}
        />
      )}
    </div>
  );
}
