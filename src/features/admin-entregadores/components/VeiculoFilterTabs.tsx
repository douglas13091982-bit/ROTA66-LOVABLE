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
    <div className="flex flex-wrap gap-2 mb-5">
      {OPTS.map(({ value, label, Icon }) => {
        const active = filter === value;
        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition ${
              active
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground border border-border hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            <span
              className={`ml-0.5 px-1.5 py-0.5 rounded text-[10px] tabular-nums ${
                active ? "bg-primary-foreground/20" : "bg-muted text-foreground"
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
