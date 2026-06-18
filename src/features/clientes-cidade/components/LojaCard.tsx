import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { labelCategoria } from "@/lib/loja-categorias";
import type { LojaPublica } from "../logic/types";

export function LojaCard({ loja }: { loja: LojaPublica }) {
  return (
    <Link
      to="/c/$slug"
      params={{ slug: loja.slug }}
      className="mp-card flex items-center gap-3.5 p-3.5 rounded-2xl"
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
      <div className="flex-1 min-w-0">
        <h3 className="mp-card-title font-display text-[16px] leading-tight tracking-tight truncate">
          {loja.nome}
        </h3>
        {loja.categoria && (
          <div className="mp-tag mt-1 inline-block text-[9px] font-semibold uppercase tracking-[0.18em] px-2 py-0.5 rounded-full">
            {labelCategoria(loja.categoria)}
          </div>
        )}
        {loja.endereco && (
          <div className="mp-muted text-[11px] flex items-center gap-1 mt-1 truncate">
            <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{loja.endereco}</span>
          </div>
        )}
        {loja.taxa_entrega_base != null && (
          <div className="mp-muted text-[11px] mt-0.5">
            Taxa a partir de{" "}
            <span className="mp-price font-display font-bold">
              R$ {Number(loja.taxa_entrega_base).toFixed(2).replace(".", ",")}
            </span>
          </div>
        )}
      </div>
      <span className="mp-open text-[10px] font-semibold uppercase tracking-[0.18em] shrink-0">
        Abrir →
      </span>
    </Link>
  );
}
