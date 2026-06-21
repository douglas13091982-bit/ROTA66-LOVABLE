import { MapPin, DollarSign } from "lucide-react";
import type { OrdenacaoPedidos } from "../hooks/use-ordenacao-pedidos";

interface Props {
  value: OrdenacaoPedidos;
  onChange: (v: OrdenacaoPedidos) => void;
}

export function OrdenacaoToggle({ value, onChange }: Props) {
  const btn = (active: boolean) =>
    `flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-md transition ${
      active
        ? "bg-white/10 text-white shadow-inner"
        : "text-white/55 hover:text-white/80"
    }`;

  return (
    <div
      className="mb-3 flex gap-1 p-1 rounded-lg border border-white/10"
      style={{ background: "oklch(0.18 0.02 260 / 0.6)" }}
      role="tablist"
      aria-label="Ordenar pedidos"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === "proximos"}
        className={btn(value === "proximos")}
        onClick={() => onChange("proximos")}
      >
        <MapPin className="h-3 w-3" />
        Mais próximos
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "valor"}
        className={btn(value === "valor")}
        onClick={() => onChange("valor")}
      >
        <DollarSign className="h-3 w-3" />
        Maior valor
      </button>
    </div>
  );
}
