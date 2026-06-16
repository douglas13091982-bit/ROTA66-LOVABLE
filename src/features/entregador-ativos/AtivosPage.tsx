import { EntregadorShell } from "@/components/EntregadorShell";
import { useAuth } from "@/hooks/use-auth";
import { liquidoEntregador, useTaxaSistema } from "@/hooks/use-taxa-sistema";
import { FinalizadoBanner } from "./components/FinalizadoBanner";
import { RotaBlock } from "./components/RotaBlock";
import { VazioBanner } from "./components/VazioBanner";
import { useLoteFinalizado } from "./hooks/use-lote-finalizado";
import {
  usePedidosAtivos,
  usePedidosLoteFinalizado,
} from "./hooks/use-pedidos-ativos";
import { agruparPorColeta } from "./logic/group";

type Props = {
  destaque?: string;
};

export function AtivosPage({ destaque }: Props) {
  const { user } = useAuth();
  const taxaSistema = useTaxaSistema();

  const { data: pedidos, isLoading } = usePedidosAtivos(user?.id);
  const { loteFinalizado, dismissedFinalizado, dismissFinalizado } =
    useLoteFinalizado(pedidos);
  const { data: recentesEntregues } = usePedidosLoteFinalizado(user?.id, loteFinalizado);

  const rotas = agruparPorColeta(pedidos ?? []);

  const semAtivos = !!pedidos && pedidos.length === 0;
  const mostrarFinalizado =
    semAtivos && !dismissedFinalizado && (recentesEntregues?.length ?? 0) > 0;
  const totalGanhoLote = (recentesEntregues ?? []).reduce(
    (s, p) => s + liquidoEntregador(p.taxa_entrega, taxaSistema, p.loja_plano_mensal_ativo),
    0,
  );

  return (
    <EntregadorShell title="Minhas Entregas">
      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      {mostrarFinalizado && (
        <FinalizadoBanner
          count={recentesEntregues!.length}
          totalGanho={totalGanhoLote}
          onDismiss={dismissFinalizado}
        />
      )}

      {semAtivos && !mostrarFinalizado && <VazioBanner />}

      <div className="space-y-6">
        {Object.entries(rotas).map(([key, items]) => (
          <RotaBlock key={key} items={items} destaque={destaque} />
        ))}
      </div>
    </EntregadorShell>
  );
}
