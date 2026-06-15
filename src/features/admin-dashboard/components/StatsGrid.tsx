import { Bike, ClipboardList, DollarSign, Store } from "lucide-react";
import { StatCard } from "./StatCard";
import type { AdminStats } from "../logic/types";

type Props = { stats: AdminStats | undefined };

export function StatsGrid({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 pp-stagger">
      <StatCard
        icon={Store}
        label="Lojas"
        value={stats?.lojas ?? 0}
        accent
        sub="Cadastradas na plataforma"
      />
      <StatCard
        icon={Bike}
        label="Entregadores"
        value={stats?.entregadores ?? 0}
        sub="Com perfil ativo"
      />
      <StatCard
        icon={ClipboardList}
        label="Pedidos totais"
        value={stats?.pedidos ?? 0}
        sub="Histórico completo"
      />
      <StatCard
        icon={DollarSign}
        label="GMV entregue"
        value={`R$ ${(stats?.gmv ?? 0).toFixed(2)}`}
        sub="Volume bruto realizado"
      />
    </div>
  );
}
