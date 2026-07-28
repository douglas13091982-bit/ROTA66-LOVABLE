import { Bike, Car, Truck, Users, Zap, type LucideIcon } from "lucide-react";
import type { VeiculoFilter } from "../logic/types";

const OPTS: { value: VeiculoFilter; label: string; Icon: LucideIcon }[] = [
  { value: "todos", label: "Todos", Icon: Users },
  { value: "moto", label: "Moto", Icon: Bike },
  { value: "bike_eletrica", label: "Bike elétrica", Icon: Zap },
  { value: "carro", label: "Carro", Icon: Car },
  { value: "caminhonete", label: "Caminhonete", Icon: Truck },
];

export function VeiculoFilterTabs({
  filter,
  counts,
  onChange,
}: {
  filter: VeiculoFilter;
  counts: Record<VeiculoFilter, number>;
  onChange: (v: VeiculoFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {OPTS.map(({ value, label, Icon }) => {
        const active = filter === value;
        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={`inline-flex items-center gap-2.5 px-5 py-3 text-xs font-bold uppercase tracking-wider rounded-xl border transition ${
              active
                ? "bg-primary text-primary-foreground border-transparent"
                : "bg-white/[0.03] text-muted-foreground border-white/10 hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums ${
                active ? "bg-black/20" : "bg-white/[0.06] text-foreground"
              }`}
            >
              {counts[value] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
