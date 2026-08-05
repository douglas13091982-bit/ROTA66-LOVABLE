import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { EntregadorShell } from "@/components/EntregadorShell";
import { useGeolocalizacao } from "@/hooks/use-geolocalizacao";
import { usePedidosDisponiveis } from "@/hooks/use-pedidos-disponiveis";
import { useAcoesPedido } from "@/hooks/use-acoes-pedido";
import { usePopupNotificacao } from "@/hooks/use-popup-notificacao";
import type { GrupoPedido } from "@/types/pedido";
import { SemVinculoEstado } from "./components/SemVinculoEstado";
import { RotaAtivaEstado } from "./components/RotaAtivaEstado";
import { RotasDisponiveisList } from "./components/RotasDisponiveisList";
import { AguardandoAprovacaoEstado } from "./components/AguardandoAprovacaoEstado";
import { AguardandoDocumentosEstado } from "./components/AguardandoDocumentosEstado";
import { useEntregadorAprovacao } from "@/hooks/use-entregador-aprovacao";
import { useEntregadorDocumentos } from "@/features/entregador-documentos/use-entregador-documentos";
import { useOrdenacaoPedidos } from "./hooks/use-ordenacao-pedidos";
import { GoogleMapDisponiveis } from "./components/GoogleMapDisponiveis";
import { PedidoDrawerEntregador } from "@/components/entregador/PedidoDrawerEntregador";

export function DisponiveisPage() {
  const navigate = useNavigate();
  const { posicao: minhaPos } = useGeolocalizacao();
  const { dismissed, aceitarGrupo } = useAcoesPedido();
  const { ordenacao, setOrdenacao } = useOrdenacaoPedidos();
  const {
    grupos,
    isLoading,
    temRotaAtiva,
    rotaAtivaResolvida,
    semVinculoNemExterno,
    ganhoHoje,
    taxaParaExibir,
    estouOnline,
  } = usePedidosDisponiveis(dismissed);
  const { aprovado, bloqueado, isLoading: aprovacaoLoading } = useEntregadorAprovacao();
  const { data: docs, docsAprovados, isLoading: docsLoading } = useEntregadorDocumentos();

  // Dispara o som configurado pelo admin sempre que aparece um grupo novo
  // no topo da lista. O hook também cuida do desbloqueio do áudio no Android
  // (gesto do usuário) e do pré-carregamento do MP3.
  usePopupNotificacao(aprovado ? grupos : []);

  // Pedido de turno entra já atribuído ao entregador ("indo coletar"): em vez
  // de mostrar a tela "Você já tem uma rota ativa", manda direto para os
  // detalhes do pedido ativo.
  useEffect(() => {
    if (rotaAtivaResolvida && temRotaAtiva) {
      void navigate({ to: "/entregador/ativos", replace: true });
    }
  }, [rotaAtivaResolvida, temRotaAtiva, navigate]);






  // Bridge estável: PedidoListItem agora memoiza, então este callback PRECISA
  // ser referencialmente estável — caso contrário, todo tick de polling
  // invalida o memo e re-renderiza a lista inteira.
  const handleAceitar = useCallback(
    (grupo: GrupoPedido) => {
      void aceitarGrupo(grupo.items);
    },
    [aceitarGrupo],
  );

  // Enquanto o status de aprovação/documentos ainda está carregando, não
  // renderiza nada — evita o "piscar" da tela de aguardando aprovação em
  // recargas do app quando o usuário já está aprovado.
  if (aprovacaoLoading || docsLoading) {
    return <EntregadorShell title="Disponíveis"><div className="h-40" /></EntregadorShell>;
  }

  if (!aprovado) {
    return (
      <EntregadorShell title="Disponíveis">
        <AguardandoAprovacaoEstado bloqueado={bloqueado} />
      </EntregadorShell>
    );
  }

  if (!docsAprovados) {
    return (
      <EntregadorShell title="Disponíveis">
        <AguardandoDocumentosEstado status={docs?.status ?? "pendente"} motivo={docs?.motivo_rejeicao ?? null} />
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

  const isListaVisivel = rotaAtivaResolvida && !temRotaAtiva && estouOnline;

  return (
    <EntregadorShell
      title="Rotas Disponíveis"
      topFixed={
        <>
          <AtivarPushBanner />
          <ApkUpdateBanner />
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
      {!rotaAtivaResolvida ? (
        <div className="bg-card border border-border rounded-lg p-6 text-center">
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </div>
      ) : temRotaAtiva ? (
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
