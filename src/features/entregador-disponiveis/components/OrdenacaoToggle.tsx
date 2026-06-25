import { MapPin, DollarSign } from "lucide-react";
import type { OrdenacaoPedidos } from "../hooks/use-ordenacao-pedidos";

interface Props {
  value: OrdenacaoPedidos;
  onChange: (v: OrdenacaoPedidos) => void;
}

export function OrdenacaoToggle({ value, onChange }: Props) {
  const segment = (active: boolean) =>
    [
      "flex-1 flex items-center justify-center gap-1.5 h-full rounded-full transition-all duration-300",
      active
        ? "bg-gradient-to-r from-[#ef4444] to-[#dc2626] shadow-lg shadow-red-500/30 ring-1 ring-[#f87171]/30 text-white"
        : "text-slate-400 hover:text-slate-200",
    ].join(" ");

  return (
    <div
      className="mb-4 relative flex p-1 h-9 rounded-full items-center bg-[#16223a] shadow-inner border border-white/5"
      role="tablist"
      aria-label="Ordenar pedidos"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === "proximos"}
        className={segment(value === "proximos")}
        onClick={() => onChange("proximos")}
      >
        <MapPin className="h-3 w-3" strokeWidth={2.5} />
        <span className="text-[9px] font-extrabold tracking-widest uppercase">
          Mais Próximos
        </span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "valor"}
        className={segment(value === "valor")}
        onClick={() => onChange("valor")}
      >
        <DollarSign className="h-3 w-3" strokeWidth={2.5} />
        <span className="text-[9px] font-extrabold tracking-widest uppercase">
          Maior Valor
        </span>
      </button>
    </div>
  );
}
