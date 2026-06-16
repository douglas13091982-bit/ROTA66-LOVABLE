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

export function DisponiveisPage() {
  const navigate = useNavigate();
  const taxaSistema = useTaxaSistema();
  const { posicao: minhaPos } = useGeolocalizacao();
  const { dismissed, aceitarGrupo } = useAcoesPedido();
  const {
    grupos,
    isLoading,
    temRotaAtiva,
    semVinculoNemExterno,
    ganhoHoje,
    taxaParaExibir,
  } = usePedidosDisponiveis(dismissed);

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
          onAceitar={aceitarGrupo}
        />
      )}

      <AnunciosEntregador />
    </EntregadorShell>
  );
}
