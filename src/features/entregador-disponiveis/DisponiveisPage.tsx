import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { EntregadorShell } from "@/components/EntregadorShell";
import { AnunciosEntregador } from "@/components/AnunciosEntregador";
import { GanhoHojeCard } from "@/components/entregador/GanhoHojeCard";
import { useGeolocalizacao } from "@/hooks/use-geolocalizacao";
import { usePedidosDisponiveis } from "@/hooks/use-pedidos-disponiveis";
import { useAcoesPedido } from "@/hooks/use-acoes-pedido";
import { usePopupNotificacao } from "@/hooks/use-popup-notificacao";
import type { GrupoPedido } from "@/types/pedido";
import { SemVinculoEstado } from "./components/SemVinculoEstado";
import { RotaAtivaEstado } from "./components/RotaAtivaEstado";
import { RotasDisponiveisList } from "./components/RotasDisponiveisList";
import { useOrdenacaoPedidos } from "./hooks/use-ordenacao-pedidos";

export function DisponiveisPage() {
  const navigate = useNavigate();
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
    estouOnline,
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
      ) : !estouOnline ? (
        <div className="bg-card border border-border rounded-lg p-6 text-center">
          <p className="font-display text-xl mb-2">VOCÊ ESTÁ OFFLINE</p>
          <p className="text-sm text-muted-foreground">
            Fique online no menu do entregador para começar a receber pedidos.
          </p>
        </div>
      ) : (
        <RotasDisponiveisList
          grupos={grupos}
          isLoading={isLoading}
          minhaPos={minhaPos}
          taxaParaExibir={taxaParaExibir}
          onAceitar={handleAceitar}
          ordenacao={ordenacao}
          onOrdenacaoChange={setOrdenacao}
        />
      )}


      <AnunciosEntregador />
    </EntregadorShell>
  );
}
