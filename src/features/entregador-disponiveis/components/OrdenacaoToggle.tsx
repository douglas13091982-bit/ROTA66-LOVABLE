import { MapPin, DollarSign } from "lucide-react";
import type { OrdenacaoPedidos } from "../hooks/use-ordenacao-pedidos";

interface Props {
  value: OrdenacaoPedidos;
  onChange: (v: OrdenacaoPedidos) => void;
}

export function OrdenacaoToggle({ value, onChange }: Props) {
  const pill = (active: boolean) =>
    `flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-full text-[9px] font-extrabold uppercase tracking-[0.12em] transition`;

  return (
    <div
      className="mb-4 flex gap-2"
      role="tablist"
      aria-label="Ordenar pedidos"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === "proximos"}
        className={pill(value === "proximos")}
        onClick={() => onChange("proximos")}
        style={
          value === "proximos"
            ? {
                background: "#ef4444",
                color: "#ffffff",
                boxShadow: "0 8px 20px -10px rgba(239,68,68,0.6)",
              }
            : { background: "#f1f3f7", color: "#374151" }
        }
      >
        <MapPin className="h-3.5 w-3.5" />
        Mais próximos
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "valor"}
        className={pill(value === "valor")}
        onClick={() => onChange("valor")}
        style={
          value === "valor"
            ? {
                background: "#ef4444",
                color: "#ffffff",
                boxShadow: "0 8px 20px -10px rgba(239,68,68,0.6)",
              }
            : { background: "#f1f3f7", color: "#374151" }
        }
      >
        <DollarSign className="h-3.5 w-3.5" />
        Maior valor
      </button>
    </div>
  );
}
