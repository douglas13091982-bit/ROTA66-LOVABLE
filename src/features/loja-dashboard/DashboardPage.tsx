import { Bike, ClipboardList, DollarSign, TrendingUp } from "lucide-react";
import { LojaShell } from "@/components/LojaShell";
import { useMinhaLoja } from "@/hooks/use-loja";
import { useLojaStats } from "./hooks/use-loja-stats";
import { CriarLojaForm } from "./components/CriarLojaForm";
import { LojaHeader } from "./components/LojaHeader";
import { StatCard } from "./components/StatCard";
import { EntregadoresLista } from "./components/EntregadoresLista";
import { CatalogoPublicoCard } from "./components/CatalogoPublicoCard";

export function DashboardPage() {
  const { data: loja, isLoading } = useMinhaLoja();
  const { data: stats } = useLojaStats(loja?.id);

  if (isLoading) {
    return (
      <LojaShell title="Dashboard">
        <div className="pp-card rounded-2xl p-10 grid place-items-center text-white/50 text-sm">
          <span className="inline-flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Carregando dados da loja…
          </span>
        </div>
      </LojaShell>
    );
  }

  if (!loja) {
    return (
      <LojaShell title="Dashboard">
        <CriarLojaForm />
      </LojaShell>
    );
  }

  return (
    <LojaShell title="Dashboard">
      <LojaHeader nome={loja.nome} ativa={loja.ativa} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 pp-stagger">
        <StatCard
          icon={ClipboardList}
          label="Pedidos hoje"
          value={String(stats?.pedidosHoje ?? 0)}
          accent
          sub="Recebidos nas últimas 24h"
        />
        <StatCard
          icon={TrendingUp}
          label="Em andamento"
          value={String(stats?.ativos ?? 0)}
          sub="Aguardando entrega"
        />
        <StatCard
          icon={DollarSign}
          label="Faturamento hoje"
          value={`R$ ${(stats?.faturamentoHoje ?? 0).toFixed(2)}`}
          sub="Apenas pedidos entregues"
        />
        <StatCard
          icon={Bike}
          label="Entregadores"
          value={String(stats?.entregadores ?? 0)}
          sub="Vinculados à loja"
        />
      </div>

      <div className="mb-8">
        <EntregadoresLista lojaId={loja.id} />
      </div>

      <CatalogoPublicoCard
        catalogoSlug={(loja as any).catalogo_slug ?? loja.slug}
      />
    </LojaShell>
  );
}
