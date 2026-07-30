import { Link } from "@tanstack/react-router";
import {
  Beef,
  Bike,
  Cake,
  ChevronLeft,
  Coffee,
  CupSoda,
  Flame,
  Heart,
  IceCream,
  MapPin,
  Phone,
  Pizza,
  Sandwich,
  Share2,
  Soup,
  Star,
  Timer,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";

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
  aberta: boolean;
  busca: string;
  setBusca: (v: string) => void;
  categorias: string[];
  catAtiva: string;
  setCatAtiva: (v: string) => void;
  nota?: number | null;
  taxaEntrega?: number | null;
  tempoEntrega?: string | null;
};

function iconeCategoria(nome: string) {
  const n = nome.toLowerCase();
  if (n.includes("burg") || n.includes("lanch") || n.includes("sandu")) return Sandwich;
  if (n.includes("pizza")) return Pizza;
  if (n.includes("bebida") || n.includes("refri") || n.includes("suco")) return CupSoda;
  if (n.includes("sobremesa") || n.includes("doce") || n.includes("bolo")) return Cake;
  if (n.includes("sorvete") || n.includes("açaí") || n.includes("acai")) return IceCream;
  if (n.includes("porç") || n.includes("porc") || n.includes("fritas")) return Beef;
  if (n.includes("café") || n.includes("cafe")) return Coffee;
  if (n.includes("sopa") || n.includes("caldo")) return Soup;
  if (n.includes("combo")) return Flame;
  return UtensilsCrossed;
}

export function CatalogoHeader({
  loja,
  aberta,
  busca,
  setBusca,
  categorias,
  catAtiva,
  setCatAtiva,
  nota,
  taxaEntrega,
  tempoEntrega,
}: Props) {
  const compartilhar = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: loja.nome, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado!");
      }
    } catch {
      /* cancelado */
    }
  };

  return (
    <header className="sticky top-0 z-30">
      {/* Topbar navy */}
      <div className="cc-topbar">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center gap-3">
          {loja.cidade ? (
            <Link
              to="/clientes/$cidade"
              params={{ cidade: encodeURIComponent(loja.cidade) }}
              className="flex items-center gap-3 min-w-0 flex-1"
            >
              <ChevronLeft className="h-6 w-6 shrink-0" strokeWidth={2} />
              <span className="text-[12px] uppercase tracking-[0.16em] font-semibold truncate">
                Voltar para o marketplace
              </span>
            </Link>
          ) : (
            <Link to="/clientes" className="flex items-center gap-3 min-w-0 flex-1">
              <ChevronLeft className="h-6 w-6 shrink-0" strokeWidth={2} />
              <span className="text-[12px] uppercase tracking-[0.16em] font-semibold truncate">
                Voltar para o marketplace
              </span>
            </Link>
          )}
          <button
            type="button"
            onClick={compartilhar}
            aria-label="Compartilhar"
            className="h-9 w-9 shrink-0 rounded-full border border-white/40 flex items-center justify-center active:scale-95 transition"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Favoritar"
            onClick={() => toast.success("Loja marcada como favorita!")}
            className="h-9 w-9 shrink-0 rounded-full border border-white/40 flex items-center justify-center active:scale-95 transition"
          >
            <Heart className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="cc-hero-bg border-b border-border">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-start gap-4">
            {loja.logo_url ? (
              <div className="relative shrink-0">
                <img
                  src={loja.logo_url}
                  alt={loja.nome}
                  className="h-[74px] w-[74px] rounded-2xl object-cover shadow-sm"
                />
                <span
                  className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full ring-2 ring-background ${aberta ? "bg-emerald-500" : "bg-red-500"}`}
                />
              </div>
            ) : (
              <div
                className="h-[74px] w-[74px] rounded-2xl shrink-0 flex items-center justify-center text-white cc-serif text-3xl shadow-sm"
                style={{ background: "var(--gradient-brand)" }}
              >
                {loja.nome.charAt(0)}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full ${
                  aberta ? "bg-emerald-500/12 text-emerald-600" : "bg-red-500/12 text-red-600"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${aberta ? "bg-emerald-500" : "bg-red-500"}`} />
                {aberta ? "Loja aberta" : "Loja fechada"}
              </span>
              <h1 className="cc-serif cc-ink-text text-[26px] leading-tight mt-1 truncate">{loja.nome}</h1>
              <div className="text-[13px] text-muted-foreground mt-1 space-y-0.5">
                {loja.endereco && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">
                      {loja.endereco}
                      {loja.cidade ? ` — ${loja.cidade}` : ""}
                    </span>
                  </div>
                )}
                {loja.telefone && (
                  <a href={`tel:${loja.telefone}`} className="flex items-center gap-1.5 hover:text-foreground transition">
                    <Phone className="h-3.5 w-3.5" /> {loja.telefone}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Barra de indicadores */}
          <div className="cc-card rounded-2xl mt-3.5 px-3 py-3 grid grid-cols-3 divide-x divide-border text-center">
            <div className="flex items-center justify-center gap-2">
              <Star className="h-4 w-4 cc-gold-text fill-current" />
              <span className="cc-serif text-[16px]">
                {nota != null ? nota.toFixed(1).replace(".", ",") : "5,0"}
              </span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span className="cc-serif text-[15px]">{tempoEntrega || "30–45 min"}</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Bike className="h-4 w-4 text-muted-foreground" />
              <span className="cc-serif text-[15px]">
                {taxaEntrega != null && taxaEntrega > 0
                  ? `Entrega R$ ${taxaEntrega.toFixed(2).replace(".", ",")}`
                  : "Entrega"}
              </span>
            </div>
          </div>

        </div>

        {categorias.length > 0 && !busca && (
          <div className="max-w-2xl mx-auto pb-3.5 relative">
            <div className="flex gap-2.5 overflow-x-auto cc-scroll-x px-4 pb-1 snap-x scroll-smooth">
              <button
                onClick={() => {
                  setCatAtiva("");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`shrink-0 snap-start inline-flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] rounded-2xl whitespace-nowrap ${catAtiva === "" ? "cc-chip cc-chip-active" : "cc-chip"}`}
              >
                <Flame className="h-4 w-4" /> Destaques
              </button>
              {categorias.map((c) => {
                const Icon = iconeCategoria(c);
                return (
                  <button
                    key={c}
                    onClick={() => {
                      setCatAtiva(c);
                      document.getElementById(`cat-${c}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`shrink-0 snap-start inline-flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] rounded-2xl whitespace-nowrap ${catAtiva === c ? "cc-chip cc-chip-active" : "cc-chip"}`}
                  >
                    <Icon className="h-4 w-4" /> {c}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
