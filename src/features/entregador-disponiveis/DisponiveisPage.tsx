import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { EntregadorShell } from "@/components/EntregadorShell";
import { AnunciosEntregador } from "@/components/AnunciosEntregador";
import { GanhoHojeCard } from "@/components/entregador/GanhoHojeCard";
import { useTaxaSistema } from "@/hooks/use-taxa-sistema";
import { useGeolocalizacao } from "@/hooks/use-geolocalizacao";
import { usePedidosDisponiveis } from "@/hooks/use-pedidos-disponiveis";
import { useAcoesPedido } from "@/hooks/use-acoes-pedido";
import type { GrupoPedido } from "@/types/pedido";
import { SemVinculoEstado } from "./components/SemVinculoEstado";
import { RotaAtivaEstado } from "./components/RotaAtivaEstado";
import { RotasDisponiveisList } from "./components/RotasDisponiveisList";
import { useOrdenacaoPedidos } from "./hooks/use-ordenacao-pedidos";

export function DisponiveisPage() {
  const navigate = useNavigate();
  const taxaSistema = useTaxaSistema();
  const { posicao: minhaPos } = useGeolocalizacao();
  const { dismissed, aceitarGrupo } = useAcoesPedido();
  const { ordenacao, setOrdenacao } = useOrdenacaoPedidos();
  const {
    grupos,
    isLoading,
    temRotaAtiva,
    semVinculoNemExterno,
    ganhoHoje,
    taxaParaExibir,
  } = usePedidosDisponiveis(dismissed);

  // Bridge estável: PedidoListItem agora memoiza, então este callback PRECISA
  // ser referencialmente estável — caso contrário, todo tick de polling
  // invalida o memo e re-renderiza a lista inteira.
  const handleAceitar = useCallback(
    (grupo: GrupoPedido) => {
      void aceitarGrupo(grupo.items);
    },
    [aceitarGrupo],
  );

  if (semVinculoNemExterno) {
    return (
      <EntregadorShell title="Disponíveis">
        <SemVinculoEstado />
      </EntregadorShell>
    );
  }

  return (
    <EntregadorShell title="Rotas Disponíveis">
      <GanhoHojeCard valor={ganhoHoje} />

      {temRotaAtiva ? (
        <RotaAtivaEstado onVerRota={() => navigate({ to: "/entregador/ativos" })} />
      ) : (
        <RotasDisponiveisList
          grupos={grupos}
          isLoading={isLoading}
          minhaPos={minhaPos}
          taxaSistema={taxaSistema}
          taxaParaExibir={taxaParaExibir}
          onAceitar={handleAceitar}
        />
      )}

      <AnunciosEntregador />
    </EntregadorShell>
  );
}
