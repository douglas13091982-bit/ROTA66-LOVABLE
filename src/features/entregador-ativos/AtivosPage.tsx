import { EntregadorShell } from "@/components/EntregadorShell";
import { useAuth } from "@/hooks/use-auth";
import { ganhoPedidoEntregador } from "@/lib/ganho-pedido";
import { FinalizadoBanner } from "./components/FinalizadoBanner";
import { RotaBlock } from "./components/RotaBlock";
import { VazioBanner } from "./components/VazioBanner";
import {
  abrirRetornoLoja,
  useRetornoLojaSalvo,
} from "./components/RetornoLojaDialog";

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

  const { data: pedidos, isLoading } = usePedidosAtivos(user?.id);
  const { loteFinalizado, dismissedFinalizado, dismissFinalizado } =
    useLoteFinalizado(pedidos);
  const { data: recentesEntregues } = usePedidosLoteFinalizado(user?.id, loteFinalizado);

  const retornoSalvo = useRetornoLojaSalvo();
  const rotas = agruparPorColeta(pedidos ?? []);

  const semAtivos = !!pedidos && pedidos.length === 0;
  const mostrarFinalizado =
    semAtivos && !dismissedFinalizado && (recentesEntregues?.length ?? 0) > 0 && !retornoSalvo;
  const totalGanhoLote = (recentesEntregues ?? []).reduce(
    (s, p) =>
      s +
      ganhoPedidoEntregador(p),
    0,
  );

  const pendenteRetorno = retornoSalvo?.pedidoId
    ? recentesEntregues?.find((p) => p.id === retornoSalvo.pedidoId)
    : null;

  return (
    <EntregadorShell title="Minhas Entregas">
      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      {(mostrarFinalizado || !!retornoSalvo) && (
        <FinalizadoBanner
          count={recentesEntregues?.length ?? 0}
          totalGanho={totalGanhoLote}
          onDismiss={dismissFinalizado}
          retornoPendente={retornoSalvo}
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
