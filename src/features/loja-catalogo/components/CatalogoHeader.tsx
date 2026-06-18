import { Link } from "@tanstack/react-router";
import { ChevronLeft, MapPin, Phone, Search } from "lucide-react";

type Loja = {
  nome: string;
  logo_url?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  telefone?: string | null;
  ativa?: boolean | null;
};

type Props = {
  loja: Loja;
  busca: string;
  setBusca: (v: string) => void;
  categorias: string[];
  catAtiva: string;
  setCatAtiva: (v: string) => void;
};

export function CatalogoHeader({ loja, busca, setBusca, categorias, catAtiva, setCatAtiva }: Props) {
  return (
    <header className="cc-glass sticky top-0 z-30">
      <div className="cc-hero-bg cc-noise">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-3 relative">
          <div className="flex justify-center mb-3">
            {loja.cidade ? (
              <Link
                to="/clientes/$cidade"
                params={{ cidade: encodeURIComponent(loja.cidade) }}
                className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold px-4 py-2 rounded-full bg-foreground text-background shadow-sm hover:opacity-90 active:scale-[0.98] transition"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Voltar para o marketplace
              </Link>
            ) : (
              <Link
                to="/clientes"
                className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold px-4 py-2 rounded-full bg-foreground text-background shadow-sm hover:opacity-90 active:scale-[0.98] transition"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Voltar para o marketplace
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3.5">
            {loja.logo_url ? (
              <div className="relative shrink-0">
                <img src={loja.logo_url} alt={loja.nome} className="h-14 w-14 rounded-2xl object-cover border border-border shadow-sm" />
                <span className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full ring-2 ring-background ${loja.ativa ? "bg-emerald-500" : "bg-muted-foreground"}`} />
              </div>
            ) : (
              <div
                className="h-14 w-14 rounded-2xl shrink-0 flex items-center justify-center text-primary-foreground font-display text-2xl shadow-sm"
                style={{ background: "var(--gradient-brand)" }}
              >
                {loja.nome.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Catálogo</span>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                <span className={`text-[9px] font-semibold uppercase tracking-[0.22em] ${loja.ativa ? "text-emerald-600" : "text-muted-foreground"}`}>
                  {loja.ativa ? "Aberto agora" : "Fechado agora"}
                </span>
              </div>
              <h1 className="font-display text-[19px] tracking-tight truncate leading-tight cc-ink-text mt-0.5">{loja.nome}</h1>
              <div className="text-[11px] text-muted-foreground space-y-0.5 mt-0.5">
                {loja.endereco && (
                  <div className="flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {loja.endereco}
                      {loja.cidade ? `, ${loja.cidade}` : ""}
                    </span>
                  </div>
                )}
                {loja.telefone && (
                  <a href={`tel:${loja.telefone}`} className="flex items-center gap-1 hover:text-foreground transition">
                    <Phone className="h-3 w-3" /> {loja.telefone}
                  </a>
                )}
              </div>
            </div>
          </div>

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

      {categorias.length > 0 && !busca && (
        <div className="max-w-2xl mx-auto pb-3.5 pt-1 relative bg-background/0">
          <div className="flex gap-2 overflow-x-auto cc-scroll-x px-4 pb-1 snap-x scroll-smooth">
            <button
              onClick={() => {
                setCatAtiva("");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
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
  );
}
