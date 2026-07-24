import { MapPin, Trophy } from "lucide-react";
import type { OrdenacaoPedidos } from "../hooks/use-ordenacao-pedidos";

interface Props {
  value: OrdenacaoPedidos;
  onChange: (v: OrdenacaoPedidos) => void;
}

interface CardProps {
  active: boolean;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
  ariaSelected: boolean;
}

function OrdenacaoCard({ active, title, subtitle, icon, onClick, ariaSelected }: CardProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={ariaSelected}
      onClick={onClick}
      className={[
        "flex-1 flex items-center gap-2 rounded-2xl px-3 py-3 transition-all duration-300 text-left",
        active
          ? "bg-[#AE0000] shadow-lg shadow-[#AE0000]/30 ring-1 ring-[#cc3535]/40"
          : "bg-transparent border border-white/15 hover:border-white/25",
      ].join(" ")}
    >
      <span
        className={[
          "grid place-items-center h-8 w-8 rounded-full shrink-0",
          active ? "text-white" : "text-white/85",
        ].join(" ")}
      >
        {icon}
      </span>
      <span className="flex flex-col leading-tight min-w-0">
        <span
          className={[
            "text-[11px] font-extrabold tracking-[0.14em] uppercase",
            active ? "text-white" : "text-white",
          ].join(" ")}
        >
          {title}
        </span>
        <span
          className={[
            "text-[10px] font-medium tracking-wide truncate",
            active ? "text-white/85" : "text-white/55",
          ].join(" ")}
        >
          {subtitle}
        </span>
      </span>
    </button>
  );
}

export function OrdenacaoToggle({ value, onChange }: Props) {
  return (
    <div
      className="mb-4 flex gap-2"
      role="tablist"
      aria-label="Ordenar pedidos"
    >
      <OrdenacaoCard
        active={value === "proximos"}
        ariaSelected={value === "proximos"}
        onClick={() => onChange("proximos")}
        title="Mais Próximos"
        subtitle="Ver pedidos próximos"
        icon={<MapPin className="h-4 w-4" strokeWidth={2.5} />}
      />
      <OrdenacaoCard
        active={value === "valor"}
        ariaSelected={value === "valor"}
        onClick={() => onChange("valor")}
        title="Maior Valor"
        subtitle="Ver maior valor"
        icon={<Trophy className="h-4 w-4" strokeWidth={2.5} />}
      />
    </div>
  );
}
