import { useLojaCategorias } from "@/hooks/use-loja-categorias";
import { getCategoriaIcon } from "@/lib/categoria-icons";

import iconRestaurante from "@/assets/categorias/restaurante.webp";
import iconLanchonete from "@/assets/categorias/lanchonete.webp";
import iconPizzaria from "@/assets/categorias/pizzaria.webp";
import iconSorveteria from "@/assets/categorias/sorveteria.webp";
import iconDoceria from "@/assets/categorias/doceria.webp";
import iconPadaria from "@/assets/categorias/padaria.webp";
import iconAcougue from "@/assets/categorias/acougue.webp";
import iconHortifruti from "@/assets/categorias/hortifruti.webp";
import iconMercado from "@/assets/categorias/mercado.webp";
import iconConveniencia from "@/assets/categorias/conveniencia.webp";
import iconBebidas from "@/assets/categorias/bebidas.webp";
import iconFarmacia from "@/assets/categorias/farmacia.webp";
import iconPetShop from "@/assets/categorias/pet_shop.webp";
import iconAutoPecas from "@/assets/categorias/auto_pecas.webp";
import iconMotoPecas from "@/assets/categorias/moto_pecas.webp";
import iconRoupas from "@/assets/categorias/roupas.webp";
import iconCalcados from "@/assets/categorias/calcados.webp";
import iconConstrucao from "@/assets/categorias/material_construcao.webp";
import iconEletronicos from "@/assets/categorias/eletronicos.webp";
import iconFloricultura from "@/assets/categorias/floricultura.webp";
import iconLivraria from "@/assets/categorias/livraria.webp";
import iconOutros from "@/assets/categorias/outros.webp";

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
  const { categorias } = useLojaCategorias();
  return (
    <div className="max-w-2xl mx-auto pb-3 pt-2 relative">
      <div
        className="flex gap-3 overflow-x-auto px-4 pb-1 snap-x scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        {categorias.map((c) => {
          const uploaded = c.icone_url;
          const icon = ICONS[c.value];
          const LucideIcon = getCategoriaIcon(c.icone);
          const active = value === c.value;
          return (
            <button
              key={c.value}
              onClick={() => onChange(c.value)}
              className={`shrink-0 snap-start flex flex-col items-center gap-1 w-[68px] ${
                active ? "opacity-100" : "opacity-90"
              }`}
            >
              <div
                className={`h-[48px] w-[68px] rounded-lg flex items-center justify-center bg-white/95 overflow-hidden ${
                  active ? "ring-2 ring-[var(--rota-red)]" : ""
                }`}
              >
                {uploaded ? (
                  <img
                    src={uploaded}
                    alt={c.label}
                    loading="lazy"
                    className="h-[42px] w-[56px] object-contain"
                  />
                ) : icon ? (
                  <img
                    src={icon}
                    alt={c.label}
                    loading="lazy"
                    width={68}
                    height={48}
                    className="h-[42px] w-[56px] object-contain"
                  />
                ) : LucideIcon ? (
                  <LucideIcon className="h-6 w-6 text-[var(--rota-red)]" />
                ) : (
                  <span className="text-[22px]">🛍️</span>
                )}
              </div>
              <span className="text-[10px] font-semibold text-center leading-tight line-clamp-2">
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
