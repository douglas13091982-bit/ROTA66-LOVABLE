import { Link } from "@tanstack/react-router";

import { labelCategoria } from "@/lib/loja-categorias";
import type { LojaPublica } from "../logic/types";

export function LojaCard({ loja }: { loja: LojaPublica }) {
  return (
    <Link
      to="/c/$slug"
      params={{ slug: loja.slug }}
      className="mp-card flex items-center gap-3 p-3 rounded-2xl h-full w-full"
    >
      {loja.logo_url ? (
        <img
          src={loja.logo_url}
          alt={loja.nome}
          className="h-16 w-16 rounded-2xl object-cover shrink-0"
          style={{ border: "1px solid rgba(222,205,180,0.22)" }}
        />
      ) : (
        <div
          className="h-16 w-16 rounded-2xl shrink-0 flex items-center justify-center text-[#decdb4] font-display text-2xl"
          style={{ background: "linear-gradient(135deg,#bb1010,#7a0a0a)" }}
        >
          {loja.nome.charAt(0)}
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <h3 className="mp-card-title text-[12px] font-semibold uppercase tracking-[0.14em] leading-tight truncate">
          {loja.nome}
        </h3>
        {loja.categoria && (
          <div className="mp-tag self-start text-[9px] font-semibold uppercase tracking-[0.18em] px-2 py-0.5 rounded-full max-w-full truncate">
            {labelCategoria(loja.categoria)}
          </div>
        )}
        <span className="mp-open text-[10px] font-semibold uppercase tracking-[0.18em] mt-0.5">
          Abrir →
        </span>
      </div>
    </Link>
  );
}
