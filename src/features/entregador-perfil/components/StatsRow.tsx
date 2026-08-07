import { Clock, ShoppingBag, Star } from "lucide-react";

type Props = {
  entregas: number;
  tempo: string;
};

function Cell({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Star;
  value: string;
  label: string;
}) {
  return (
    <div className="flex-1 flex flex-col items-center gap-2 py-1">
      <Icon className="h-6 w-6" strokeWidth={2} style={{ color: "#e3000f" }} />
      <div className="text-[26px] font-extrabold leading-none tracking-tight text-white">
        {value}
      </div>
      <div className="text-[13px] text-white/60">{label}</div>
    </div>
  );
}

export function StatsRow({ entregas, tempo }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-2 py-4 flex items-stretch divide-x divide-white/10">
      <Cell icon={Star} value="5.0" label="Avaliação" />
      <Cell icon={ShoppingBag} value={entregas.toLocaleString("pt-BR")} label="Pedidos" />
      <Cell icon={Clock} value={tempo} label="Tempo online" />
    </div>
  );
}
