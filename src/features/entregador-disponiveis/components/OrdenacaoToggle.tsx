import { MapPin, Trophy, ChevronRight } from "lucide-react";
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
  activeClasses: string;
}

function OrdenacaoCard({ active, title, subtitle, icon, onClick, ariaSelected, activeClasses }: CardProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={ariaSelected}
      data-surface={active ? "red" : "navy"}
      onClick={onClick}
      className={[
        "flex-1 min-w-0 flex items-center gap-2 rounded-xl px-2.5 py-2 transition-all duration-300 text-left",
        active
          ? activeClasses
          : "bg-[#0d2c54] shadow-md shadow-[#0d2c54]/25 ring-1 ring-[#0d2c54]/30 hover:brightness-110",
      ].join(" ")}
    >
      <span
        className={[
          "grid place-items-center h-7 w-7 rounded-full shrink-0",
          active ? "bg-white/15 text-white" : "bg-white/8 text-white/85",
        ].join(" ")}
      >
        {icon}
      </span>
      <span className="flex flex-col leading-tight min-w-0 flex-1">
        <span className="text-[10px] font-extrabold tracking-[0.1em] uppercase text-white whitespace-nowrap">
          {title}
        </span>
        <span
          className={[
            "text-[9px] font-medium tracking-wide truncate",
            active ? "text-white/85" : "text-white/55",
          ].join(" ")}
        >
          {subtitle}
        </span>
      </span>
      <ChevronRight
        className={[
          "h-3.5 w-3.5 shrink-0 transition-colors",
          active ? "text-white" : "text-white/40",
        ].join(" ")}
        strokeWidth={2.5}
      />
    </button>
  );
}

export function OrdenacaoToggle({ value, onChange }: Props) {
  return (
    <div
      className="flex flex-col gap-2"
      role="tablist"
      aria-label="Ordenar pedidos"
    >
      <OrdenacaoCard
        active={value === "proximos"}
        ariaSelected={value === "proximos"}
        onClick={() => onChange("proximos")}
        title="Mais Próximos"
        subtitle="Ver pedidos próximos"
        icon={<MapPin className="h-3.5 w-3.5" strokeWidth={2.5} />}
        activeClasses="bg-[#e3000f] shadow-md shadow-[#e3000f]/35 ring-1 ring-[#e3000f]/40"
      />
      <OrdenacaoCard
        active={value === "valor"}
        ariaSelected={value === "valor"}
        onClick={() => onChange("valor")}
        title="Maior Valor"
        subtitle="Ver maior valor"
        icon={<Trophy className="h-3.5 w-3.5" strokeWidth={2.5} />}
        activeClasses="bg-[#e3000f] shadow-md shadow-[#e3000f]/35 ring-1 ring-[#e3000f]/40"
      />
    </div>
  );
}
