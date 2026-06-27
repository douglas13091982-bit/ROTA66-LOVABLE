import { useCallback, useEffect } from "react";
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
import { RotasDisponiveisHeader } from "./components/RotasDisponiveisHeader";
import { AguardandoAprovacaoEstado } from "./components/AguardandoAprovacaoEstado";
import { useEntregadorAprovacao } from "@/hooks/use-entregador-aprovacao";
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
  const { aprovado, bloqueado, isLoading: isLoadingStatus } = useEntregadorAprovacao();

  // Dispara o som configurado pelo admin sempre que aparece um grupo novo
  // no topo da lista. O hook também cuida do desbloqueio do áudio no Android
  // (gesto do usuário) e do pré-carregamento do MP3.
  usePopupNotificacao(aprovado ? grupos : []);

  // Redireciona entregadores pendentes direto para o cadastro da chave PIX
  useEffect(() => {
    if (!isLoadingStatus && !aprovado && !bloqueado) {
      void navigate({ to: "/entregador/perfil", replace: true });
    }
  }, [isLoadingStatus, aprovado, bloqueado, navigate]);



  // Bridge estável: PedidoListItem agora memoiza, então este callback PRECISA
  // ser referencialmente estável — caso contrário, todo tick de polling
  // invalida o memo e re-renderiza a lista inteira.
  const handleAceitar = useCallback(
    (grupo: GrupoPedido) => {
      void aceitarGrupo(grupo.items);
    },
    [aceitarGrupo],
  );

  if (!aprovado) {
    return (
      <EntregadorShell title="Disponíveis">
        <AguardandoAprovacaoEstado bloqueado={bloqueado} />
      </EntregadorShell>
    );
  }

  if (semVinculoNemExterno) {
    return (
      <EntregadorShell title="Disponíveis">
        <SemVinculoEstado />
      </EntregadorShell>
    );
  }

  const isListaVisivel = !temRotaAtiva && estouOnline;

  return (
    <EntregadorShell
      title="Rotas Disponíveis"
      topFixed={
        <>
          <GanhoHojeCard valor={ganhoHoje} />
          {isListaVisivel && (
            <RotasDisponiveisHeader
              ordenacao={ordenacao}
              onOrdenacaoChange={setOrdenacao}
            />
          )}
        </>
      }
    >
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
