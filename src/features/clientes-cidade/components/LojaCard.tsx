import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";

import { labelCategoria } from "@/lib/loja-categorias";
import type { LojaPublica } from "../logic/types";
import type { FreteInfo } from "../hooks/use-fretes-lojas";

interface Props {
  loja: LojaPublica;
  frete?: FreteInfo | null;
  freteCarregando?: boolean;
  semEndereco?: boolean;
}

export function LojaCard({ loja, frete, freteCarregando, semEndereco }: Props) {
  const taxaBase = Number(loja.taxa_entrega_base) || 0;

  let freteLabel: string;
  if (frete) {
    freteLabel = `R$ ${frete.valor.toFixed(2).replace(".", ",")}`;
  } else if (freteCarregando) {
    freteLabel = "calculando…";
  } else if (semEndereco) {
    freteLabel = taxaBase > 0
      ? `a partir de R$ ${taxaBase.toFixed(2).replace(".", ",")}`
      : "informe seu endereço";
  } else {
    freteLabel = taxaBase > 0
      ? `R$ ${taxaBase.toFixed(2).replace(".", ",")}`
      : "A combinar";
  }

  return (
    <Link
      to="/c/$slug"
      params={{ slug: loja.slug }}
      className="flex items-center gap-4 w-full py-3 active:opacity-70 transition"
    >
      {loja.logo_url ? (
        <img
          src={loja.logo_url}
          alt={loja.nome}
          className="h-16 w-16 rounded-2xl object-cover shrink-0"
          style={{ border: "1px solid rgba(222,205,180,0.18)" }}
        />
      ) : (
        <div
          className="h-16 w-16 rounded-2xl shrink-0 flex items-center justify-center text-[#decdb4] font-display text-2xl"
          style={{ background: "linear-gradient(135deg,#bb1010,#7a0a0a)" }}
        >
          {loja.nome.charAt(0)}
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <h3
          className="mp-card-title text-[15px] font-medium leading-tight truncate"
          style={{ fontFamily: "var(--font-body)" }}
        >
          {loja.nome}
        </h3>
        <div className="flex items-center gap-1.5 text-[13px] mp-muted flex-wrap font-normal">
          <Star className="h-3 w-3 fill-[var(--rota-gold)] stroke-[var(--rota-gold)]" />
          <span className="text-[var(--rota-gold)]">Novo</span>
          {loja.categoria && (
            <>
              <span className="opacity-50">•</span>
              <span className="truncate">{labelCategoria(loja.categoria)}</span>
            </>
          )}
          <span
            className="ml-1 px-2 py-0.5 rounded-full text-[11px] font-medium border"
            style={{
              borderColor: "rgba(212,168,76,0.45)",
              color: "var(--rota-gold)",
              background: "rgba(212,168,76,0.10)",
            }}
          >
            Ver Catálogo
          </span>
        </div>
        <div className="text-[13px] mp-muted font-normal">
          Frete <span>{freteLabel}</span>
          {frete && (
            <span className="opacity-60"> · {frete.km.toFixed(1)} km</span>
          )}
        </div>
      </div>
    </Link>
  );
}
