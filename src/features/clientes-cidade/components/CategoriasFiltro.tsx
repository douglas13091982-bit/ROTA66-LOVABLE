import { LOJA_CATEGORIAS } from "@/lib/loja-categorias";

import iconRestaurante from "@/assets/categorias/restaurante.png";
import iconLanchonete from "@/assets/categorias/lanchonete.png";
import iconPizzaria from "@/assets/categorias/pizzaria.png";
import iconSorveteria from "@/assets/categorias/sorveteria.png";
import iconDoceria from "@/assets/categorias/doceria.png";
import iconPadaria from "@/assets/categorias/padaria.png";
import iconAcougue from "@/assets/categorias/acougue.png";
import iconHortifruti from "@/assets/categorias/hortifruti.png";
import iconMercado from "@/assets/categorias/mercado.png";
import iconConveniencia from "@/assets/categorias/conveniencia.png";
import iconBebidas from "@/assets/categorias/bebidas.png";
import iconFarmacia from "@/assets/categorias/farmacia.png";
import iconPetShop from "@/assets/categorias/pet_shop.png";
import iconAutoPecas from "@/assets/categorias/auto_pecas.png";
import iconMotoPecas from "@/assets/categorias/moto_pecas.png";
import iconRoupas from "@/assets/categorias/roupas.png";
import iconCalcados from "@/assets/categorias/calcados.png";
import iconConstrucao from "@/assets/categorias/material_construcao.png";
import iconEletronicos from "@/assets/categorias/eletronicos.png";
import iconFloricultura from "@/assets/categorias/floricultura.png";
import iconLivraria from "@/assets/categorias/livraria.png";
import iconOutros from "@/assets/categorias/outros.png";

const ICONS: Record<string, string> = {
  restaurante: iconRestaurante,
  lanchonete: iconLanchonete,
  pizzaria: iconPizzaria,
  sorveteria: iconSorveteria,
  doceria: iconDoceria,
  padaria: iconPadaria,
  acougue: iconAcougue,
  hortifruti: iconHortifruti,
  mercado: iconMercado,
  conveniencia: iconConveniencia,
  bebidas: iconBebidas,
  farmacia: iconFarmacia,
  pet_shop: iconPetShop,
  auto_pecas: iconAutoPecas,
  moto_pecas: iconMotoPecas,
  roupas: iconRoupas,
  calcados: iconCalcados,
  material_construcao: iconConstrucao,
  eletronicos: iconEletronicos,
  floricultura: iconFloricultura,
  livraria: iconLivraria,
  outros: iconOutros,
};

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function CategoriasFiltro({ value, onChange }: Props) {
  return (
    <div className="max-w-2xl mx-auto pb-3 pt-2 relative">
      <div
        className="flex gap-3 overflow-x-auto px-4 pb-1 snap-x scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        <button
          onClick={() => onChange("")}
          className={`shrink-0 snap-start flex flex-col items-center gap-1.5 w-[88px] ${
            value === "" ? "opacity-100" : "opacity-80"
          }`}
        >
          <div
            className={`h-[64px] w-[88px] rounded-xl flex items-center justify-center bg-white/95 ${
              value === "" ? "ring-2 ring-[var(--rota-red)]" : ""
            }`}
          >
            <span className="text-[28px]">🍽️</span>
          </div>
          <span className="text-[11px] font-semibold text-center leading-tight">Todas</span>
        </button>
        {LOJA_CATEGORIAS.map((c) => {
          const icon = ICONS[c.value];
          const active = value === c.value;
          return (
            <button
              key={c.value}
              onClick={() => onChange(c.value)}
              className={`shrink-0 snap-start flex flex-col items-center gap-1.5 w-[88px] ${
                active ? "opacity-100" : "opacity-90"
              }`}
            >
              <div
                className={`h-[64px] w-[88px] rounded-xl flex items-center justify-center bg-white/95 overflow-hidden ${
                  active ? "ring-2 ring-[var(--rota-red)]" : ""
                }`}
              >
                {icon ? (
                  <img
                    src={icon}
                    alt={c.label}
                    loading="lazy"
                    width={88}
                    height={64}
                    className="h-[56px] w-[72px] object-contain"
                  />
                ) : (
                  <span className="text-[28px]">🛍️</span>
                )}
              </div>
              <span className="text-[11px] font-semibold text-center leading-tight line-clamp-2">
                {c.label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="pointer-events-none absolute top-0 right-0 h-full w-10 mp-fade" />
    </div>
  );
}
