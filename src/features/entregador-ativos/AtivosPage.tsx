import { EntregadorShell } from "@/components/EntregadorShell";
import { useAuth } from "@/hooks/use-auth";
import { liquidoEntregador } from "@/hooks/use-taxa-sistema";
import { FinalizadoBanner } from "./components/FinalizadoBanner";
import { RotaBlock } from "./components/RotaBlock";
import { VazioBanner } from "./components/VazioBanner";
import {
  abrirRetornoLoja,
  lerRetornoLojaSalvo,
  RetornoLojaDialog,
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

  const retornoSalvo = lerRetornoLojaSalvo();
  const rotas = agruparPorColeta(pedidos ?? []);

  const semAtivos = !!pedidos && pedidos.length === 0;
  const mostrarFinalizado =
    semAtivos && !dismissedFinalizado && (recentesEntregues?.length ?? 0) > 0;
  const totalGanhoLote = (recentesEntregues ?? []).reduce(
    (s, p) =>
      s +
      liquidoEntregador(
        p.taxa_entrega,
        Number(p.loja_taxa_por_pedido ?? 0),
        p.loja_plano_mensal_ativo,
      ),
    0,
  );

  const pendenteRetorno = retornoSalvo?.pedidoId
    ? recentesEntregues?.find((p) => p.id === retornoSalvo.pedidoId)
    : null;

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

      {pendenteRetorno && retornoSalvo && (
        <div className="mb-4 rounded-2xl border border-amber-400/40 bg-amber-500/15 p-4 shadow-soft">
          <div className="text-[10px] uppercase tracking-[0.2em] text-amber-300 font-bold mb-2">
            Retorno à loja pendente
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            O pedido #{pendenteRetorno.numero} foi pago com cartão na entrega. Abra a rota de volta para devolver a maquininha.
          </p>
          <button
            onClick={() =>
              abrirRetornoLoja(retornoSalvo.endereco, retornoSalvo.pedidoId, retornoSalvo.numero)
            }
            className="w-full px-4 py-3 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase text-xs tracking-[0.16em] rounded-xl"
          >
            Abrir retorno à loja
          </button>
        </div>
      )}

      {semAtivos && !mostrarFinalizado && <VazioBanner />}

      <div className="space-y-6">
        {Object.entries(rotas).map(([key, items]) => (
          <RotaBlock key={key} items={items} destaque={destaque} />
        ))}
      </div>
      <RetornoLojaDialog />
    </EntregadorShell>
  );
}
