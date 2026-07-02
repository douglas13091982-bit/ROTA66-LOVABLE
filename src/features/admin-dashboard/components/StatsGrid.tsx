import { Bike, Building2, ClipboardList, DollarSign, Store } from "lucide-react";
import { StatCard } from "./StatCard";
import type { AdminStats } from "../logic/types";
import { useFranquia } from "@/hooks/use-franquia";

type Props = { stats: AdminStats | undefined };

export function StatsGrid({ stats }: Props) {
  const { isOwner } = useFranquia();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8 pp-stagger">
      <StatCard
        icon={Store}
        label="Lojas"
        value={stats?.lojas ?? 0}
        accent
        sub="Cadastradas na plataforma"
      />
      {isOwner && (
        <StatCard
          icon={Building2}
          label="Franqueados"
          value={stats?.franqueados ?? 0}
          sub="Cidades em operação"
        />
      )}
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
