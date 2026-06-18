import { Link } from "@tanstack/react-router";
import { ChevronLeft, Search, UserRound } from "lucide-react";
import { PerfilDialog } from "./PerfilDialog";

interface Props {
  cidade: string;
  uf?: string;
  logoUrl: string;
  nomeSistema: string;
  busca: string;
  onBuscaChange: (v: string) => void;
}

export function CidadeHero({ cidade, uf, logoUrl, nomeSistema, busca, onBuscaChange }: Props) {
  return (
    <div className="cc-hero-bg cc-noise">
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-3 relative">
        <div className="flex items-center justify-between gap-2 mb-1">
          <img src={logoUrl} alt={nomeSistema} className="h-7 w-auto object-contain" />
          <PerfilDialog>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/80 hover:text-foreground bg-card border border-border rounded-full px-3 py-1.5 transition"
            >
              <UserRound className="h-3.5 w-3.5" /> Meu cadastro
            </button>
          </PerfilDialog>
        </div>
        <Link
          to="/clientes"
          className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground hover:text-foreground transition mb-2"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Trocar cidade
        </Link>
        <h1 className="font-display text-[26px] tracking-tight leading-tight cc-ink-text">
          Lojas em {cidade}
          {uf ? <span className="text-muted-foreground text-[14px] ml-1">· {uf}</span> : null}
        </h1>
        <div className="relative mt-3.5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
            placeholder="Buscar loja…"
            className="w-full pl-10 pr-3 py-3 bg-card border border-border rounded-2xl text-[14px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-foreground/40 focus:ring-4 focus:ring-foreground/5 transition"
          />
        </div>
      </div>
    </div>
  );
}
