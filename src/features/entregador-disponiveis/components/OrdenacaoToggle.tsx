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
        "flex-1 min-w-0 flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all duration-300 text-left",
        active
          ? "shadow-lg shadow-[#AE0000]/40 ring-1 ring-[#cc3535]/50"
          : "border border-white/15 hover:border-white/30",
      ].join(" ")}
      style={
        active
          ? { background: "#AE0000" }
          : { background: "rgba(11,37,64,0.55)" }
      }
    >
      <span
        className={[
          "grid place-items-center h-9 w-9 rounded-full shrink-0",
          active ? "bg-white/15 text-white" : "bg-white/8 text-white/90 border border-white/15",
        ].join(" ")}
      >
        {icon}
      </span>
      <span className="flex flex-col leading-tight min-w-0 flex-1">
        <span className="text-[13px] font-extrabold tracking-[0.06em] uppercase text-white whitespace-nowrap">
          {title}
        </span>
        <span
          className={[
            "text-[11px] font-medium tracking-wide truncate",
            active ? "text-white/90" : "text-white/60",
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
      className="mb-4 flex gap-3"
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
