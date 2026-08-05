import { useCallback, useEffect, useState } from "react";
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
import { AguardandoDocumentosEstado } from "./components/AguardandoDocumentosEstado";
import { useEntregadorAprovacao } from "@/hooks/use-entregador-aprovacao";
import { useEntregadorDocumentos } from "@/features/entregador-documentos/use-entregador-documentos";
import { useOrdenacaoPedidos } from "./hooks/use-ordenacao-pedidos";
import { AtivarPushBanner } from "./components/AtivarPushBanner";
import { ApkUpdateBanner } from "./components/ApkUpdateBanner";
import { GoogleMapDisponiveis } from "./components/GoogleMapDisponiveis";

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

  const [showFilters, setShowFilters] = useState(false);
  const isListaVisivel = rotaAtivaResolvida && !temRotaAtiva && estouOnline;

  return (
    <EntregadorShell title="Rotas Disponíveis" onToggleFilter={() => setShowFilters(!showFilters)}>
      <div className="absolute inset-0 z-0">
        <GoogleMapDisponiveis 
          minhaPos={minhaPos} 
          grupos={grupos} 
          onSelecionarGrupo={(g) => {
            // Se clicar no marcador do mapa, poderíamos abrir o detalhe do grupo
            // Como RotasDisponiveisList já tem um Dialog interno, podemos expor uma ref ou apenas renderizar a lista
          }}
        />
      </div>

      <div className="relative z-10 h-full flex flex-col pointer-events-none">
        <div className="p-4 space-y-3 pointer-events-auto">
          <AtivarPushBanner />
          <ApkUpdateBanner />
        </div>

        <div className="mt-auto pointer-events-auto">
          {!rotaAtivaResolvida ? (
            <div className="m-4 bg-[#1a2b4b]/90 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-center text-white">
              <p className="text-sm opacity-60">Carregando…</p>
            </div>
          ) : temRotaAtiva ? (
            <div className="m-4">
              <RotaAtivaEstado onVerRota={() => navigate({ to: "/entregador/ativos" })} />
            </div>
          ) : !estouOnline ? (
            <div className="m-4 bg-[#1a2b4b]/95 backdrop-blur-md border border-white/10 rounded-2xl p-8 text-center text-white shadow-2xl">
              <div className="w-16 h-16 bg-[#AE0000]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-[#AE0000] rounded-full animate-pulse" />
              </div>
              <p className="font-black text-2xl mb-2 tracking-tight uppercase">Você está offline</p>
              <p className="text-sm opacity-60 leading-relaxed px-4">
                Clique no botão <span className="text-[#AE0000] font-bold">CONECTAR</span> abaixo para começar a receber pedidos e faturar.
              </p>
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto px-4 pb-32">
              <RotasDisponiveisList
                grupos={grupos}
                isLoading={isLoading}
                minhaPos={minhaPos}
                taxaParaExibir={taxaParaExibir}
                onAceitar={handleAceitar}
                ordenacao={ordenacao}
                onOrdenacaoChange={setOrdenacao}
              />
            </div>
          )}
        </div>
      </div>

      <AnunciosEntregador />
    </EntregadorShell>
  );
}
