import { Link } from "@tanstack/react-router";
import { Star, CheckCircle2 } from "lucide-react";

import { useLojaCategorias, labelCategoriaDinamico } from "@/hooks/use-loja-categorias";
import type { LojaPublica } from "../logic/types";
import type { FreteInfo } from "../hooks/use-fretes-lojas";
import type { AvaliacaoResumo } from "../hooks/use-avaliacoes-lojas";

interface Props {
  loja: LojaPublica;
  frete?: FreteInfo | null;
  freteCarregando?: boolean;
  semEndereco?: boolean;
  avaliacao?: AvaliacaoResumo | null;
}

export function LojaCard({ loja, frete, freteCarregando, semEndereco, avaliacao }: Props) {
  const { categorias } = useLojaCategorias();
  const taxaBase = Number(loja.taxa_entrega_base) || 0;

  let freteLabel: string;
  if (frete) {
    freteLabel = `Frete R$ ${frete.valor.toFixed(2).replace(".", ",")}`;
  } else if (freteCarregando) {
    freteLabel = "Calculando frete…";
  } else if (semEndereco) {
    freteLabel =
      taxaBase > 0
        ? `Entrega a partir de R$ ${taxaBase.toFixed(2).replace(".", ",")}`
        : "Entrega disponível";
  } else {
    freteLabel =
      taxaBase > 0 ? `Frete R$ ${taxaBase.toFixed(2).replace(".", ",")}` : "Entrega disponível";
  }

  return (
    <Link
      to="/c/$slug"
      params={{ slug: loja.slug }}
      className="mp-card flex items-center gap-3 w-full rounded-2xl p-3 active:scale-[0.99] transition"
    >
      {loja.logo_url ? (
        <img
          src={loja.logo_url}
          alt={loja.nome}
          className="h-[60px] w-[60px] rounded-2xl object-cover shrink-0"
        />
      ) : (
        <div
          className="h-[60px] w-[60px] rounded-2xl shrink-0 flex items-center justify-center text-white font-display text-2xl"
          style={{ background: "linear-gradient(135deg,#0d2c54,#123a6d)" }}
        >
          {loja.nome.charAt(0)}
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <h3 className="mp-card-title text-[15px] font-bold leading-snug truncate">{loja.nome}</h3>

        <div className="flex items-center gap-1.5 text-[12px] mp-muted min-w-0">
          <Star className="h-3.5 w-3.5 fill-[#f5b301] stroke-[#f5b301] shrink-0" />
          <span className="font-semibold" style={{ color: "#0d2c54" }}>
            {avaliacao && avaliacao.total > 0 ? avaliacao.media.toFixed(1) : "5.0"}
          </span>
          {avaliacao && avaliacao.total > 0 && (
            <span className="opacity-60">({avaliacao.total})</span>
          )}
          {loja.categoria && (
            <>
              <span className="opacity-30">|</span>
              <span className="truncate">{labelCategoriaDinamico(loja.categoria, categorias)}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[12px] mp-muted min-w-0">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: "#16a34a" }} />
          <span className="truncate">{freteLabel}</span>
          {frete && <span className="opacity-60 shrink-0">· {frete.km.toFixed(1)} km</span>}
        </div>
      </div>

      <span className="mp-btn-catalogo shrink-0 rounded-xl px-3 py-2.5 text-[12px] font-bold whitespace-nowrap">
        Ver Catálogo
      </span>
    </Link>
  );
}
