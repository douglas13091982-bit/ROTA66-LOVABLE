import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { withSignedProdutoImages } from "@/lib/produto-image";
import { pageWrapper, type Produto } from "./-catalogo-types";
import { criarPedidoCatalogo } from "@/lib/catalogo.functions";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { useTarifaEntrega } from "@/hooks/use-tarifa-entrega";
import { PagamentoMercadoPago } from "@/components/catalogo/PagamentoMercadoPago";
import { MapPin, Phone, ShoppingBag, Plus, Minus, X, CheckCircle2, Search, ChevronLeft, Calculator } from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/c/$slug")({
  component: CatalogoPublico,
  head: ({ params }) => ({
    meta: [
      { title: `Catálogo — ${params.slug}` },
      { name: "description", content: "Faça seu pedido online" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#ffffff" },
    ],
  }),
});





function CatalogoPublico() {
  const { slug } = Route.useParams();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [showCheckout, setShowCheckout] = useState(false);
  const [sucesso, setSucesso] = useState<{ id: string; numero: number } | null>(null);
  const [busca, setBusca] = useState("");
  const [catAtiva, setCatAtiva] = useState<string>("");

  const { data: loja, isLoading: loadingLoja } = useQuery({
    queryKey: ["catalogo-loja", slug],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lojas_publicas")
        .select("id, nome, slug, catalogo_slug, telefone, endereco, endereco_lat, endereco_lng, cidade, estado, logo_url, taxa_entrega_base, catalogo_ativo, ativa, status, plano_mensal_ativo, catalogo_layout")
        .eq("catalogo_slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: produtos } = useQuery({
    queryKey: ["catalogo-produtos", loja?.id],
    enabled: !!loja?.id && (loja as any).catalogo_ativo === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos" as any)
        .select("id, nome, descricao, preco, imagem_url, categoria")
        .eq("loja_id", loja!.id)
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return await withSignedProdutoImages(data as unknown as Produto[]);
    },
  });

  const { data: catalogoConfig } = useQuery({
    queryKey: ["catalogo-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_roteirizacao" as any)
        .select("catalogo_horizontal_min_produtos, catalogo_horizontal_min_categorias")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as { catalogo_horizontal_min_produtos: number; catalogo_horizontal_min_categorias: number } | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const produtosMap = useMemo(() => new Map((produtos ?? []).map((p) => [p.id, p])), [produtos]);
  const cartItems = Object.entries(cart).map(([id, qtd]) => ({ produto: produtosMap.get(id)!, qtd })).filter((i) => i.produto);
  const subtotal = cartItems.reduce((s, i) => s + i.produto.preco * i.qtd, 0);
  const taxaBase = Number(loja?.taxa_entrega_base) || 0;
  const totalItens = Object.values(cart).reduce((s, n) => s + n, 0);

  const categorias = useMemo(() => {
    const set = new Set<string>();
    (produtos ?? []).forEach((p) => p.categoria && set.add(p.categoria));
    return Array.from(set);
  }, [produtos]);

  const minProdutos = catalogoConfig?.catalogo_horizontal_min_produtos ?? 50;
  const minCategorias = catalogoConfig?.catalogo_horizontal_min_categorias ?? 5;
  const isCatalogoHorizontal = (produtos ?? []).length >= minProdutos && categorias.length >= minCategorias;

  const produtosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    let list = produtos ?? [];
    if (q) list = list.filter((p) => p.nome.toLowerCase().includes(q) || (p.descricao ?? "").toLowerCase().includes(q));
    return list;
  }, [produtos, busca]);

  function addItem(id: string) { setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 })); }
  function removeItem(id: string) {
    setCart((c) => {
      const q = (c[id] ?? 0) - 1;
      const n = { ...c };
      if (q <= 0) delete n[id]; else n[id] = q;
      return n;
    });
  }

  if (loadingLoja) return <div className="catalogo-clean min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!loja || !(loja as any).catalogo_ativo || !loja.ativa || loja.status !== "aprovado") {
    return (
      <div className="catalogo-clean min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center">
          <h1 className="font-display text-3xl mb-2 cc-ink-text">Catálogo indisponível</h1>
          <p className="text-muted-foreground mb-6">Esta loja ainda não liberou o catálogo online.</p>
          <Link to="/" className="text-primary font-semibold uppercase tracking-[0.18em] text-xs hover:underline">Voltar ao início</Link>
        </div>
      </div>
    );
  }

  if (sucesso) {
    return (
      <div className="catalogo-clean min-h-screen flex items-center justify-center bg-background p-6">
        <div className="cc-card rounded-3xl p-8 max-w-md w-full text-center cc-reveal">
          <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center ring-1 ring-emerald-200">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" strokeWidth={2.2} />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-1">Pedido confirmado</p>
          <h1 className="font-display text-3xl mb-3 cc-ink-text">Obrigado!</h1>
          <p className="text-sm text-muted-foreground mb-1">Seu número de pedido</p>
          <p className="font-display text-6xl text-primary mb-1 tracking-tighter tabular-nums">#{sucesso.numero}</p>
          <div className="cc-divider-gold my-5" />
          <p className="text-sm text-muted-foreground mb-6">A loja recebeu seu pedido. Acompanhe em tempo real abaixo.</p>
          <Link to="/rastreio/$pedidoId" params={{ pedidoId: sucesso.id }} className="cc-cta block w-full px-5 py-4 rounded-2xl font-semibold uppercase text-[12px] tracking-[0.18em] mb-2">
            Acompanhar pedido
          </Link>
          <button onClick={() => { setSucesso(null); setCart({}); }} className="text-[11px] text-muted-foreground hover:text-foreground uppercase tracking-[0.18em] py-2 font-medium">
            Voltar ao catálogo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={pageWrapper}>
      {/* Header glass premium */}
      <header className="cc-glass sticky top-0 z-30">
        <div className="cc-hero-bg cc-noise">
          <div className="max-w-2xl mx-auto px-4 pt-4 pb-3 relative">
            <Link to="/clientes" className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground hover:text-foreground transition mb-2">
              <ChevronLeft className="h-3.5 w-3.5" /> Voltar para o app
            </Link>
            <div className="flex items-center gap-3.5">
              {loja.logo_url ? (
                <div className="relative shrink-0">
                  <img src={loja.logo_url} alt={loja.nome} className="h-14 w-14 rounded-2xl object-cover border border-border shadow-sm" />
                  <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                </div>
              ) : (
                <div className="h-14 w-14 rounded-2xl shrink-0 flex items-center justify-center text-primary-foreground font-display text-2xl shadow-sm" style={{ background: "var(--gradient-brand)" }}>
                  {loja.nome.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Catálogo</span>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                  <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-emerald-600">Aberto agora</span>
                </div>
                <h1 className="font-display text-[19px] tracking-tight truncate leading-tight cc-ink-text mt-0.5">{loja.nome}</h1>
                <div className="text-[11px] text-muted-foreground space-y-0.5 mt-0.5">
                  {loja.endereco && <div className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{loja.endereco}{loja.cidade ? `, ${loja.cidade}` : ""}</span></div>}
                  {loja.telefone && (
                    <a href={`tel:${loja.telefone}`} className="flex items-center gap-1 hover:text-foreground transition">
                      <Phone className="h-3 w-3" /> {loja.telefone}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Busca refinada */}
            <div className="relative mt-3.5">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar no catálogo…"
                className="w-full pl-10 pr-3 py-3 bg-card border border-border rounded-2xl text-[14px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-foreground/40 focus:ring-4 focus:ring-foreground/5 transition"
              />
            </div>
          </div>
        </div>

        {/* Categorias scroll horizontal */}
        {categorias.length > 0 && !busca && (
          <div className="max-w-2xl mx-auto pb-3.5 pt-1 relative bg-background/0">
            <div className="flex gap-2 overflow-x-auto cc-scroll-x px-4 pb-1 snap-x scroll-smooth">
              <button
                onClick={() => { setCatAtiva(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className={`shrink-0 snap-start px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] rounded-full whitespace-nowrap ${catAtiva === "" ? "cc-chip-active" : "cc-chip"}`}
              >
                Todos
              </button>
              {categorias.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setCatAtiva(c);
                    document.getElementById(`cat-${c}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`shrink-0 snap-start px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] rounded-full whitespace-nowrap ${catAtiva === c ? "cc-chip-active" : "cc-chip"}`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="pointer-events-none absolute top-0 right-0 h-full w-10 bg-gradient-to-l from-background to-transparent" />
          </div>
        )}
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-5">
        {(produtosFiltrados ?? []).length === 0 && (
          <div className="text-center py-20">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">
              {busca ? "Nenhum produto encontrado." : "Nenhum produto disponível no momento."}
            </p>
          </div>
        )}

        {busca ? (
          <ProdutoGrid items={produtosFiltrados} cart={cart} addItem={addItem} removeItem={removeItem} layout={(loja as any).catalogo_layout ?? "cards"} />
        ) : isCatalogoHorizontal ? (
          (categorias.length > 0 ? [...categorias, "Outros"] : ["Produtos"]).map((cat) => {
            const items = (produtos ?? []).filter((p) => {
              if (categorias.length === 0) return true;
              if (cat === "Outros") return !p.categoria;
              return p.categoria === cat;
            });
            if (items.length === 0) return null;
            return (
              <section key={cat} id={`cat-${cat}`} className="mb-7 scroll-mt-44">
                <div className="flex items-center gap-3 mb-3 px-1">
                  <h2 className="font-display text-[20px] cc-ink-text">{cat}</h2>
                  <div className="flex-1 cc-divider-gold" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground tabular-nums">{items.length} itens</span>
                </div>
                <CategoriaCarrossel items={items} cart={cart} addItem={addItem} removeItem={removeItem} />
              </section>
            );
          })
        ) : (
          (categorias.length > 0 ? [...categorias, "Outros"] : ["Produtos"]).map((cat) => {
            const items = (produtos ?? []).filter((p) => {
              if (categorias.length === 0) return true;
              if (cat === "Outros") return !p.categoria;
              return p.categoria === cat;
            });
            if (items.length === 0) return null;
            return (
              <section key={cat} id={`cat-${cat}`} className="mb-8 scroll-mt-44">
                <div className="flex items-center gap-3 mb-3 px-1">
                  <h2 className="font-display text-[22px] cc-ink-text">{cat}</h2>
                  <div className="flex-1 cc-divider-gold" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground tabular-nums">{items.length} itens</span>
                </div>
                <ProdutoGrid items={items} cart={cart} addItem={addItem} removeItem={removeItem} layout={(loja as any).catalogo_layout ?? "cards"} />
              </section>
            );
          })
        )}
      </main>


      {/* Sticky cart bar premium */}
      {totalItens > 0 && !showCheckout && (
        <div className="fixed bottom-0 inset-x-0 z-40 px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] cc-glass border-t border-border/60">
          <button
            onClick={() => setShowCheckout(true)}
            className="cc-cta w-full max-w-2xl mx-auto flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl font-semibold uppercase text-[12px] tracking-[0.18em]"
          >
            <span className="flex items-center gap-3">
              <span className="relative inline-flex items-center justify-center h-9 w-9 rounded-xl bg-white/15 ring-1 ring-white/20">
                <ShoppingBag className="h-4 w-4" />
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-white text-primary text-[10px] font-bold flex items-center justify-center tabular-nums shadow-md">{totalItens}</span>
              </span>
              <span>Ver carrinho</span>
            </span>
            <span className="cc-price text-[17px] normal-case tracking-tight">R$ {subtotal.toFixed(2)}</span>
          </button>
        </div>
      )}


      {showCheckout && loja && (
        <CheckoutDialog
          slug={slug}
          lojaId={loja.id}
          lojaCoords={{ lat: (loja as any).endereco_lat ?? null, lng: (loja as any).endereco_lng ?? null }}
          taxaBase={taxaBase}
          cartItems={cartItems}
          subtotal={subtotal}
          onClose={() => setShowCheckout(false)}
          onSuccess={(r) => { setShowCheckout(false); setSucesso(r); }}
          addItem={addItem}
          removeItem={removeItem}
        />
      )}
    </div>
  );
}

function ProdutoGrid({
  items, cart, addItem, removeItem, layout,
}: {
  items: Produto[];
  cart: Record<string, number>;
  addItem: (id: string) => void;
  removeItem: (id: string) => void;
  layout: "cards" | "lista";
}) {
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
            <div className="shrink-0">
              {cart[p.id] ? (
                <div className="flex items-center bg-card border border-border rounded-full shadow-sm">
                  <button onClick={() => removeItem(p.id)} aria-label="Diminuir" className="h-9 w-9 flex items-center justify-center text-primary active:scale-95 transition">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-1 min-w-[22px] text-center text-sm font-bold tabular-nums">{cart[p.id]}</span>
                  <button onClick={() => addItem(p.id)} aria-label="Adicionar" className="h-9 w-9 flex items-center justify-center text-primary active:scale-95 transition">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => addItem(p.id)}
                  aria-label="Adicionar ao carrinho"
                  className="cc-cta h-10 w-10 flex items-center justify-center rounded-full"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.5} />
                </button>
              )}
            </div>
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
              {cart[p.id] ? (
                <div className="flex items-center bg-background border border-border rounded-full shadow-sm">
                  <button onClick={() => removeItem(p.id)} aria-label="Diminuir" className="h-9 w-9 flex items-center justify-center text-primary active:scale-95 transition">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-1 min-w-[22px] text-center text-sm font-bold tabular-nums">{cart[p.id]}</span>
                  <button onClick={() => addItem(p.id)} aria-label="Adicionar" className="h-9 w-9 flex items-center justify-center text-primary active:scale-95 transition">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => addItem(p.id)}
                  aria-label="Adicionar ao carrinho"
                  className="cc-cta h-10 w-10 flex items-center justify-center rounded-full"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function CategoriaCarrossel({
  items, cart, addItem, removeItem,
}: {
  items: Produto[];
  cart: Record<string, number>;
  addItem: (id: string) => void;
  removeItem: (id: string) => void;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto cc-scroll-x snap-x snap-mandatory scroll-smooth pb-2 -mx-4 px-4">
      {items.map((p) => (
        <div
          key={p.id}
          className="cc-card snap-start shrink-0 w-[160px] sm:w-[180px] rounded-2xl p-2.5 flex flex-col gap-2 group"
        >
          <div className="cc-img-wrap h-[140px] w-full rounded-xl shrink-0 overflow-hidden">
            {p.imagem_url ? (
              <img src={p.imagem_url} alt={p.nome} loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">sem foto</div>
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <h3 className="font-display text-[13px] leading-tight tracking-tight text-foreground line-clamp-2">{p.nome}</h3>
            {p.descricao && <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 leading-snug">{p.descricao}</p>}
            <div className="mt-auto pt-2 flex items-center justify-between gap-2">
              <span className="cc-price text-[15px] text-primary leading-none">R$ {Number(p.preco).toFixed(2)}</span>
              {cart[p.id] ? (
                <div className="flex items-center bg-background border border-border rounded-full shadow-sm">
                  <button onClick={() => removeItem(p.id)} aria-label="Diminuir" className="h-7 w-7 flex items-center justify-center text-primary active:scale-95 transition">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-1 min-w-[18px] text-center text-xs font-bold tabular-nums">{cart[p.id]}</span>
                  <button onClick={() => addItem(p.id)} aria-label="Adicionar" className="h-7 w-7 flex items-center justify-center text-primary active:scale-95 transition">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => addItem(p.id)}
                  aria-label="Adicionar ao carrinho"
                  className="cc-cta h-8 w-8 flex items-center justify-center rounded-full"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}



function CheckoutDialog({
  slug, lojaId, lojaCoords, taxaBase, cartItems, subtotal, onClose, onSuccess, addItem, removeItem,
}: {
  slug: string;
  lojaId: string;
  lojaCoords: { lat: number | null; lng: number | null };
  taxaBase: number;
  cartItems: { produto: Produto; qtd: number }[];
  subtotal: number;
  onClose: () => void;
  onSuccess: (r: { id: string; numero: number }) => void;
  addItem: (id: string) => void;
  removeItem: (id: string) => void;
}) {
  const enviar = useServerFn(criarPedidoCatalogo);
  const [step, setStep] = useState<"carrinho" | "dados" | "pagar">("carrinho");
  const [form, setForm] = useState({
    cliente_nome: "",
    cliente_telefone: "",
    cliente_email: "",
    cliente_doc: "",
    endereco_entrega: "",
    complemento: "",
    observacoes: "",
    forma_pagamento: "pix" as "pix" | "dinheiro" | "cartao_credito" | "pix_online" | "cartao_online",
    troco_para: "",
  });
  const [entregaCoords, setEntregaCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const { taxa: taxaCalculada, info: taxaInfo } = useTarifaEntrega(lojaId, lojaCoords, entregaCoords);
  const temCoords = entregaCoords.lat != null && entregaCoords.lng != null && lojaCoords.lat != null && lojaCoords.lng != null;
  const taxa = temCoords ? taxaCalculada : taxaBase;
  const total = subtotal + taxa;
  const [saving, setSaving] = useState(false);
  const [pedidoPagar, setPedidoPagar] = useState<{ id: string; numero: number } | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const { data: mpConfig } = useQuery({
    queryKey: ["mp-public-config", lojaId],
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("get_mp_public_config", { _loja_id: lojaId });
      const row = (data && data[0]) ?? null;
      return row as { public_key: string; ativo: boolean } | null;
    },
  });
  const mpAtivo = !!mpConfig?.ativo && !!mpConfig.public_key;

  useEffect(() => {
    setForm((f) => {
      const opts = pagamentoOptions(mpAtivo).map((o) => o.v);
      if (!opts.includes(f.forma_pagamento)) {
        return { ...f, forma_pagamento: opts[0] };
      }
      return f;
    });
  }, [mpAtivo]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const isOnline = form.forma_pagamento === "pix_online" || form.forma_pagamento === "cartao_online";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isOnline) {
      if (!form.cliente_email.trim() || !/^\S+@\S+\.\S+$/.test(form.cliente_email)) {
        toast.error("Informe um e-mail válido para o pagamento");
        return;
      }
      const doc = form.cliente_doc.replace(/\D/g, "");
      if (doc.length !== 11 && doc.length !== 14) {
        toast.error("Informe CPF (11 dígitos) ou CNPJ (14 dígitos)");
        return;
      }
    }
    setSaving(true);
    try {
      const res = await enviar({
        data: {
          loja_slug: slug,
          cliente_nome: form.cliente_nome,
          cliente_telefone: form.cliente_telefone,
          endereco_entrega: form.endereco_entrega,
          endereco_entrega_lat: entregaCoords.lat,
          endereco_entrega_lng: entregaCoords.lng,
          complemento: form.complemento || null,
          observacoes: form.observacoes || null,
          forma_pagamento: form.forma_pagamento,
          troco_para: form.forma_pagamento === "dinheiro" && form.troco_para ? Number(form.troco_para) : null,
          itens: cartItems.map((i) => ({ produto_id: i.produto.id, qtd: i.qtd })),
        },
      });
      if (res.aguardando_pagamento) {
        setPedidoPagar({ id: res.id, numero: res.numero });
        setStep("pagar");
      } else {
        onSuccess(res);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao enviar pedido");
    } finally {
      setSaving(false);

    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-t-3xl md:rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-300"
      >
        {/* Grab handle */}
        <div className="md:hidden flex justify-center pt-2 pb-1 shrink-0">
          <div className="h-1.5 w-12 rounded-full bg-border" />
        </div>

        <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {step === "dados" && (
              <button onClick={() => setStep("carrinho")} className="p-1 -ml-1 text-muted-foreground hover:text-foreground" aria-label="Voltar">
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <h2 className="font-display text-lg sm:text-xl truncate cc-ink-text tracking-tight">
              {step === "carrinho" ? "Seu carrinho" : step === "dados" ? "Dados de entrega" : `Pagamento · #${pedidoPagar?.numero}`}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="p-2 -mr-2 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
          {step === "carrinho" && (
            <>
              <div className="space-y-2">
                {cartItems.map((i) => (
                  <div key={i.produto.id} className="flex items-center gap-3 bg-background rounded-xl p-2.5">
                    {i.produto.imagem_url ? (
                      <img src={i.produto.imagem_url} alt={i.produto.nome} className="h-14 w-14 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="h-14 w-14 rounded-lg bg-card shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate text-foreground tracking-tight">{i.produto.nome}</div>
                      <div className="text-xs text-primary cc-price">R$ {(i.produto.preco * i.qtd).toFixed(2)}</div>
                    </div>
                    <div className="flex items-center bg-card border border-border rounded-full">
                      <button onClick={() => removeItem(i.produto.id)} className="h-8 w-8 flex items-center justify-center text-primary"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="px-1 min-w-[20px] text-center text-sm font-bold tabular-nums">{i.qtd}</span>
                      <button onClick={() => addItem(i.produto.id)} className="h-8 w-8 flex items-center justify-center text-primary"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-background rounded-xl p-3 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Entrega</span><span>R$ {taxa.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold pt-1.5 border-t border-border mt-1.5 text-foreground"><span>Total</span><span className="text-primary cc-price text-xl">R$ {total.toFixed(2)}</span></div>
              </div>
            </>
          )}

          {step === "dados" && (
            <form id="checkout-form" onSubmit={handleSubmit} className="space-y-3">
              <Field label="Seu nome" required>
                <input required maxLength={120} autoComplete="name" value={form.cliente_nome} onChange={(e) => setForm({ ...form, cliente_nome: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Telefone" required>
                <input required maxLength={20} inputMode="tel" autoComplete="tel" value={form.cliente_telefone} onChange={(e) => setForm({ ...form, cliente_telefone: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Endereço de entrega" required>
                <AddressAutocomplete
                  className={inputCls}
                  value={form.endereco_entrega}
                  onChange={(v) => { setForm({ ...form, endereco_entrega: v }); setEntregaCoords({ lat: null, lng: null }); }}
                  onSelectPlace={(p) => { setForm({ ...form, endereco_entrega: p.address }); setEntregaCoords({ lat: p.lat, lng: p.lng }); }}
                  required
                  placeholder="Rua, número, bairro"
                />
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <Calculator className="h-3 w-3" />
                  {temCoords
                    ? `Frete calculado: R$ ${taxa.toFixed(2)}${taxaInfo ? ` · ${taxaInfo}` : ""}`
                    : "Selecione um endereço na lista para calcular o frete automaticamente."}
                </p>
              </Field>
              <Field label="Complemento">
                <input maxLength={200} value={form.complemento} onChange={(e) => setForm({ ...form, complemento: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Observações">
                <textarea maxLength={500} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} className={inputCls} />
              </Field>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Forma de pagamento</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
                  {pagamentoOptions(mpAtivo).map((opt) => (
                    <button key={opt.v} type="button" onClick={() => setForm({ ...form, forma_pagamento: opt.v as typeof form.forma_pagamento })}
                      className={`px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] rounded-xl border transition ${form.forma_pagamento === opt.v ? "bg-foreground text-background border-foreground shadow-sm" : "bg-card border-border text-muted-foreground hover:border-foreground/30"}`}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
              {form.forma_pagamento === "dinheiro" && (
                <Field label="Troco para R$ (opcional)">
                  <input type="number" step="0.01" inputMode="decimal" value={form.troco_para} onChange={(e) => setForm({ ...form, troco_para: e.target.value })} className={inputCls} />
                </Field>
              )}
              {isOnline && (
                <>
                  <Field label="E-mail (para recibo)" required>
                    <input required type="email" maxLength={120} value={form.cliente_email} onChange={(e) => setForm({ ...form, cliente_email: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="CPF/CNPJ" required>
                    <input required inputMode="numeric" maxLength={18} value={form.cliente_doc} onChange={(e) => setForm({ ...form, cliente_doc: e.target.value })} className={inputCls} />
                  </Field>
                </>
              )}
            </form>
          )}

          {step === "pagar" && pedidoPagar && mpConfig?.public_key && (
            <PagamentoMercadoPago
              pedidoId={pedidoPagar.id}
              numero={pedidoPagar.numero}
              valor={total}
              metodo={form.forma_pagamento as "pix_online" | "cartao_online"}
              publicKey={mpConfig.public_key}
              payerNome={form.cliente_nome}
              payerEmail={form.cliente_email}
              payerDoc={form.cliente_doc}
              onAprovado={() => onSuccess(pedidoPagar)}
            />
          )}
        </div>

        {/* Footer sticky com CTA */}
        {step !== "pagar" && (
          <div className="border-t border-border p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] bg-card shrink-0">
            {step === "carrinho" ? (
              <button
                onClick={() => setStep("dados")}
                disabled={cartItems.length === 0}
                className="cc-cta w-full px-5 py-3.5 rounded-2xl font-semibold uppercase text-[12px] tracking-[0.18em] disabled:opacity-40 flex items-center justify-between"
              >
                <span>Continuar</span>
                <span className="cc-price normal-case tracking-tight text-base">R$ {total.toFixed(2)}</span>
              </button>
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Subtotal</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Frete</span>
                  <span>R$ {taxa.toFixed(2)}</span>
                </div>
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={saving}
                  className="cc-cta w-full px-5 py-3.5 rounded-2xl font-semibold uppercase text-[12px] tracking-[0.18em] disabled:opacity-40 flex items-center justify-between"
                >
                  <span>{saving ? "Enviando..." : isOnline ? "Continuar para pagamento" : "Enviar pedido"}</span>
                  <span className="cc-price normal-case tracking-tight text-base">R$ {total.toFixed(2)}</span>
                </button>
              </>
            )}

          </div>
        )}
      </div>
    </div>

  );
}

const inputCls = "w-full px-3.5 py-3 bg-card border border-border rounded-xl text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground/40 focus:ring-4 focus:ring-foreground/5 transition";

type PagOpt = { v: "pix" | "dinheiro" | "cartao_credito" | "pix_online" | "cartao_online"; l: string };
function pagamentoOptions(mpAtivo: boolean): PagOpt[] {
  if (mpAtivo) {
    return [
      { v: "cartao_credito", l: "Cartão na entrega" },
      { v: "pix_online", l: "Pix online" },
      { v: "cartao_online", l: "Cartão online" },
    ];
  }
  return [
    { v: "pix", l: "PIX (manual)" },
    { v: "cartao_credito", l: "Cartão na entrega" },
    { v: "dinheiro", l: "Dinheiro" },
  ];
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}{required && <span className="text-primary"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
