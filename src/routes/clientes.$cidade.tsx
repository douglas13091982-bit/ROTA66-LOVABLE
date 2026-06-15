import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/hooks/use-branding";
import { ChevronLeft, MapPin, Search, Store, SlidersHorizontal } from "lucide-react";
import { LOJA_CATEGORIAS, labelCategoria } from "@/lib/loja-categorias";

type SearchParams = { uf?: string };

export const Route = createFileRoute("/clientes/$cidade")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    uf: typeof s.uf === "string" ? s.uf : undefined,
  }),
  component: ClientesCidade,
  head: ({ params }) => {
    const cidade = decodeURIComponent(params.cidade);
    return {
      meta: [
        { title: `Lojas em ${cidade}` },
        { name: "description", content: `Veja todas as lojas disponíveis em ${cidade}.` },
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
        { name: "theme-color", content: "#ffffff" },
      ],
    };
  },
});

type LojaPublica = {
  id: string;
  nome: string;
  slug: string;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  logo_url: string | null;
  taxa_entrega_base: number | null;
  categoria: string | null;
};

function ClientesCidade() {
  const { cidade } = Route.useParams();
  const { uf } = Route.useSearch();
  const cidadeDecoded = decodeURIComponent(cidade);
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("");
  const { logoUrl, nomeSistema } = useBranding();

  const { data: lojas = [], isLoading } = useQuery({
    queryKey: ["clientes-lojas", cidadeDecoded, uf ?? null],
    queryFn: async () => {
      let q = (supabase as any)
        .from("lojas_publicas")
        .select("id, nome, slug, telefone, endereco, cidade, estado, logo_url, taxa_entrega_base, categoria")
        .eq("ativa", true)
        .eq("catalogo_ativo", true)
        .eq("cidade", cidadeDecoded);
      if (uf) q = q.eq("estado", uf);
      const { data, error } = await q.order("nome");
      if (error) throw error;
      return (data ?? []) as LojaPublica[];
    },
  });

  const filtradas = useMemo(() => {
    let result = lojas;
    const t = busca.trim().toLowerCase();
    if (t) result = result.filter((l) => l.nome.toLowerCase().includes(t));
    if (categoriaFiltro) result = result.filter((l) => l.categoria === categoriaFiltro);
    return result;
  }, [lojas, busca, categoriaFiltro]);

  const categoriasDisponiveis = LOJA_CATEGORIAS;

  return (
    <div className="catalogo-clean min-h-screen bg-background pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <header className="cc-glass sticky top-0 z-30">
        <div className="cc-hero-bg cc-noise">
          <div className="max-w-2xl mx-auto px-4 pt-4 pb-3 relative">
            <div className="flex items-center gap-2 mb-1">
              <img src={logoUrl} alt={nomeSistema} className="h-7 w-auto object-contain" />
            </div>
            <Link to="/clientes" className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground hover:text-foreground transition mb-2">
              <ChevronLeft className="h-3.5 w-3.5" /> Trocar cidade
            </Link>
            <h1 className="font-display text-[26px] tracking-tight leading-tight cc-ink-text">
              Lojas em {cidadeDecoded}
              {uf ? <span className="text-muted-foreground text-[14px] ml-1">· {uf}</span> : null}
            </h1>
            <div className="relative mt-3.5">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar loja…"
                className="w-full pl-10 pr-3 py-3 bg-card border border-border rounded-2xl text-[14px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-foreground/40 focus:ring-4 focus:ring-foreground/5 transition"
              />
            </div>
          </div>
        </div>

        {categoriasDisponiveis.length > 0 && (
          <div className="max-w-2xl mx-auto pb-3.5 pt-1 relative bg-background/0">
            <div className="flex gap-2 overflow-x-auto cc-scroll-x px-4 pb-1 snap-x scroll-smooth">
              <button
                onClick={() => setCategoriaFiltro("")}
                className={`shrink-0 snap-start px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] rounded-full whitespace-nowrap ${categoriaFiltro === "" ? "cc-chip-active" : "cc-chip"}`}
              >
                <span className="inline-flex items-center gap-1.5"><SlidersHorizontal className="h-3 w-3" /> Todas</span>
              </button>
              {categoriasDisponiveis.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategoriaFiltro(c.value)}
                  className={`shrink-0 snap-start px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] rounded-full whitespace-nowrap ${categoriaFiltro === c.value ? "cc-chip-active" : "cc-chip"}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="pointer-events-none absolute top-0 right-0 h-full w-10 bg-gradient-to-l from-background to-transparent" />
          </div>
        )}
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-5">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-16 text-sm">Carregando lojas...</div>
        ) : filtradas.length === 0 ? (
          <div className="text-center py-20">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <Store className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">Nenhuma loja encontrada em {cidadeDecoded}.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3">
            {filtradas.map((l) => (
              <li key={l.id}>
                <Link
                  to="/c/$slug"
                  params={{ slug: l.slug }}
                  className="cc-card flex items-center gap-3.5 p-3.5 rounded-2xl transition-colors"
                >
                  {l.logo_url ? (
                    <img src={l.logo_url} alt={l.nome} className="h-16 w-16 rounded-2xl object-cover border border-border shadow-sm shrink-0" />
                  ) : (
                    <div className="h-16 w-16 rounded-2xl shrink-0 flex items-center justify-center text-primary-foreground font-display text-2xl shadow-sm" style={{ background: "var(--gradient-brand)" }}>
                      {l.nome.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-[16px] leading-tight tracking-tight cc-ink-text truncate">{l.nome}</h3>
                    {l.categoria && (
                      <div className="mt-1 inline-block text-[9px] font-semibold uppercase tracking-[0.18em] text-primary px-2 py-0.5 rounded-full bg-primary/10">
                        {labelCategoria(l.categoria)}
                      </div>
                    )}
                    {l.endereco && (
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1 truncate">
                        <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{l.endereco}</span>
                      </div>
                    )}
                    {l.taxa_entrega_base != null && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Taxa a partir de <span className="cc-price text-primary">R$ {Number(l.taxa_entrega_base).toFixed(2).replace(".", ",")}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-primary font-semibold uppercase tracking-[0.18em] shrink-0">Abrir</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
