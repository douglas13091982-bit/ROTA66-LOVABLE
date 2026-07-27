import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";

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
    freteLabel = `Frete R$ ${frete.valor.toFixed(2).replace(".", ",")} · ${frete.km.toFixed(1)} km`;
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

  const categoriaLabel = loja.categoria
    ? labelCategoriaDinamico(loja.categoria, categorias)
    : "Delivery";

  return (
    <Link
      to="/c/$slug"
      params={{ slug: loja.slug }}
      className="mp-card flex w-full overflow-hidden rounded-sm active:scale-[0.995] transition"
    >
      {loja.logo_url ? (
        <img
          src={loja.logo_url}
          alt={loja.nome}
          className="w-[40%] max-w-[170px] shrink-0 object-cover"
        />
      ) : (
        <div
          className="w-[40%] max-w-[170px] shrink-0 flex items-center justify-center mp-serif text-4xl text-[#f5efe3]"
          style={{ background: "linear-gradient(135deg,#0f2542,#1b3a5f)" }}
        >
          {loja.nome.charAt(0)}
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col gap-2 p-4">
        <h3 className="mp-card-title text-[24px] leading-tight font-semibold truncate">
          {loja.nome}
        </h3>

        <div className="flex items-center gap-2 text-[15px]">
          <Star className="h-4 w-4 fill-[#c8a253] stroke-[#c8a253] shrink-0" />
          <span className="mp-serif">
            {avaliacao && avaliacao.total > 0 ? avaliacao.media.toFixed(1) : "5.0"}
          </span>
          {avaliacao && avaliacao.total > 0 && (
            <span className="mp-muted text-[13px]">({avaliacao.total})</span>
          )}
        </div>

        <span className="block h-px w-10 bg-[rgba(200,162,83,0.7)]" />

        <p className="mp-muted text-[15px] leading-snug line-clamp-2">
          {categoriaLabel} · {freteLabel}
        </p>

        <span className="mp-btn-catalogo mp-serif mt-1 self-start px-4 py-2 text-[12px] uppercase">
          Ver catálogo
        </span>
      </div>
    </Link>
  );
}
