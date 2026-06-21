import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";

import { labelCategoria } from "@/lib/loja-categorias";
import type { LojaPublica } from "../logic/types";

export function LojaCard({ loja }: { loja: LojaPublica }) {
  const taxa = Number(loja.taxa_entrega_base) || 0;
  const taxaLabel =
    taxa > 0
      ? `R$ ${taxa.toFixed(2).replace(".", ",")}`
      : "A combinar";

  return (
    <Link
      to="/c/$slug"
      params={{ slug: loja.slug }}
      className="flex items-center gap-3 py-3 px-1 w-full active:opacity-70 transition"
    >
      {loja.logo_url ? (
        <img
          src={loja.logo_url}
          alt={loja.nome}
          className="h-14 w-14 rounded-full object-cover shrink-0"
          style={{ border: "1px solid rgba(222,205,180,0.18)" }}
        />
      ) : (
        <div
          className="h-14 w-14 rounded-full shrink-0 flex items-center justify-center text-[#decdb4] font-display text-xl"
          style={{ background: "linear-gradient(135deg,#bb1010,#7a0a0a)" }}
        >
          {loja.nome.charAt(0)}
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <h3
          className="mp-card-title text-[15px] font-semibold leading-tight truncate"
          style={{ fontFamily: "var(--font-body)" }}
        >
          {loja.nome}
        </h3>
        <div className="flex items-center gap-1.5 text-[12px] mp-muted">
          <Star className="h-3.5 w-3.5 fill-[var(--rota-gold)] stroke-[var(--rota-gold)]" />
          <span className="font-semibold text-[var(--rota-gold)]">Novo</span>
          {loja.categoria && (
            <>
              <span className="opacity-50">•</span>
              <span className="truncate">{labelCategoria(loja.categoria)}</span>
            </>
          )}
        </div>
        <div className="text-[12px] mp-muted truncate">
          Taxa de entrega <span className="font-semibold text-foreground/90">{taxaLabel}</span>
        </div>
      </div>
    </Link>
  );
}
