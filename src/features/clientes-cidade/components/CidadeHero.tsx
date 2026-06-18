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
    <div>
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-3 relative">
        <div className="flex items-center justify-between gap-2 mb-1">
          <img src={logoUrl} alt={nomeSistema} className="h-8 w-auto object-contain drop-shadow-[0_6px_18px_rgba(187,16,16,0.45)]" />
          <PerfilDialog>
            <button
              type="button"
              className="mp-pill inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] rounded-full px-3 py-1.5"
            >
              <UserRound className="h-3.5 w-3.5" /> Meu cadastro
            </button>
          </PerfilDialog>
        </div>
        <Link
          to="/clientes"
          className="mp-back inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] font-semibold transition mb-2"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Trocar cidade
        </Link>
        <h1 className="mp-title font-display text-[26px] tracking-tight leading-tight">
          Lojas em {cidade}
          {uf ? <span className="mp-muted text-[14px] ml-1">· {uf}</span> : null}
        </h1>
        <div className="relative mt-3.5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 mp-muted" />
          <input
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
            placeholder="Buscar loja…"
            className="mp-input w-full pl-10 pr-3 py-3 rounded-2xl text-[14px] transition"
          />
        </div>
      </div>
    </div>
  );
}
