import { Link } from "@tanstack/react-router";

import { labelCategoria } from "@/lib/loja-categorias";
import type { LojaPublica } from "../logic/types";

export function LojaCard({ loja }: { loja: LojaPublica }) {
  return (
    <Link
      to="/c/$slug"
      params={{ slug: loja.slug }}
      className="mp-card flex flex-col p-3 rounded-2xl h-full w-full"
    >
      <div className="flex justify-center mb-2.5">
        {loja.logo_url ? (
          <img
            src={loja.logo_url}
            alt={loja.nome}
            className="h-20 w-20 rounded-2xl object-cover"
            style={{ border: "1px solid rgba(222,205,180,0.22)" }}
          />
        ) : (
          <div
            className="h-20 w-20 rounded-2xl flex items-center justify-center text-[#decdb4] font-display text-3xl"
            style={{ background: "linear-gradient(135deg,#bb1010,#7a0a0a)" }}
          >
            {loja.nome.charAt(0)}
          </div>
        )}
      </div>

      <h3 className="mp-card-title text-[12px] font-semibold uppercase tracking-[0.14em] leading-tight text-center truncate">
        {loja.nome}
      </h3>

      {loja.categoria && (
        <div className="mp-tag mt-1.5 self-center text-[9px] font-semibold uppercase tracking-[0.18em] px-2 py-0.5 rounded-full max-w-full truncate">
          {labelCategoria(loja.categoria)}
        </div>
      )}


      <span className="mp-open text-[10px] font-semibold uppercase tracking-[0.18em] text-center mt-2">
        Abrir →
      </span>
    </Link>
  );
}
