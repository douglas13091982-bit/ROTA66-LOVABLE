import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { labelCategoria } from "@/lib/loja-categorias";
import type { LojaPublica } from "../logic/types";

export function LojaCard({ loja }: { loja: LojaPublica }) {
  return (
    <Link
      to="/c/$slug"
      params={{ slug: loja.slug }}
      className="cc-card flex items-center gap-3.5 p-3.5 rounded-2xl transition-colors"
    >
      {loja.logo_url ? (
        <img
          src={loja.logo_url}
          alt={loja.nome}
          className="h-16 w-16 rounded-2xl object-cover border border-border shadow-sm shrink-0"
        />
      ) : (
        <div
          className="h-16 w-16 rounded-2xl shrink-0 flex items-center justify-center text-primary-foreground font-display text-2xl shadow-sm"
          style={{ background: "var(--gradient-brand)" }}
        >
          {loja.nome.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-display text-[16px] leading-tight tracking-tight cc-ink-text truncate">
          {loja.nome}
        </h3>
        {loja.categoria && (
          <div className="mt-1 inline-block text-[9px] font-semibold uppercase tracking-[0.18em] text-primary px-2 py-0.5 rounded-full bg-primary/10">
            {labelCategoria(loja.categoria)}
          </div>
        )}
        {loja.endereco && (
          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1 truncate">
            <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{loja.endereco}</span>
          </div>
        )}
        {loja.taxa_entrega_base != null && (
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Taxa a partir de{" "}
            <span className="cc-price text-primary">
              R$ {Number(loja.taxa_entrega_base).toFixed(2).replace(".", ",")}
            </span>
          </div>
        )}
      </div>
      <span className="text-[10px] text-primary font-semibold uppercase tracking-[0.18em] shrink-0">
        Abrir
      </span>
    </Link>
  );
}
