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
import { MapDisponiveis } from "@/components/entregador/MapDisponiveis";
import { Package, Map as MapIcon, List } from "lucide-react";

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

  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [grupoSelecionado, setGrupoSelecionado] = useState<GrupoPedido | null>(null);

  return (
    <EntregadorShell
      title="Rotas Disponíveis"
      topFixed={
        <div className="flex flex-col gap-2">
          <AtivarPushBanner />
          <ApkUpdateBanner />
          <GanhoHojeCard valor={ganhoHoje} />
          {isListaVisivel && (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <RotasDisponiveisHeader
                  ordenacao={ordenacao}
                  onOrdenacaoChange={setOrdenacao}
                />
              </div>
              <button
                onClick={() => setViewMode(v => v === "map" ? "list" : "map")}
                className="h-10 w-10 rounded-xl bg-[#0d2c54] text-white flex items-center justify-center shadow-lg border border-white/10 active:scale-95 transition-all"
              >
                {viewMode === "map" ? <List className="h-5 w-5" /> : <MapIcon className="h-5 w-5" />}
              </button>
            </div>
          )}
        </div>
      }
    >
      {!rotaAtivaResolvida ? (
        <div className="bg-white/80 backdrop-blur-md border border-border/40 rounded-3xl p-8 text-center shadow-xl">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full border-4 border-[#AE0000]/20 border-t-[#AE0000] animate-spin" />
            <p className="text-sm font-bold text-navy/60 uppercase tracking-widest">Sincronizando...</p>
          </div>
        </div>
      ) : temRotaAtiva ? (
        <div className="relative z-10">
          <RotaAtivaEstado onVerRota={() => navigate({ to: "/entregador/ativos" })} />
        </div>
      ) : !estouOnline ? (
        <div className="relative z-10 bg-white border-2 border-navy/10 rounded-[32px] p-10 text-center shadow-2xl">
          <div className="h-20 w-20 bg-navy/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <Package className="h-10 w-10 text-navy/20" />
          </div>
          <p className="font-display text-2xl text-navy mb-3 tracking-tight">VOCÊ ESTÁ OFFLINE</p>
          <p className="text-sm text-navy/50 leading-relaxed font-medium">
            Fique online no botão superior para começar a receber pedidos na sua região.
          </p>
        </div>
      ) : (
        <div className="relative h-[calc(100vh-280px)] -mx-4 -mt-4">
          {viewMode === "map" ? (
            <>
              <MapDisponiveis 
                minhaPos={minhaPos} 
                grupos={grupos} 
                onSelectGrupo={setGrupoSelecionado}
              />
              
              {grupos.length > 0 && (
                <div className="absolute bottom-6 left-0 right-0 px-4 pointer-events-none">
                  <div className="max-w-xl mx-auto pointer-events-auto">
                    <RotasDisponiveisList
                      grupos={grupoSelecionado ? [grupoSelecionado] : [grupos[0]]}
                      isLoading={isLoading}
                      minhaPos={minhaPos}
                      taxaParaExibir={taxaParaExibir}
                      onAceitar={handleAceitar}
                      ordenacao={ordenacao}
                      onOrdenacaoChange={setOrdenacao}
                    />
                    {grupos.length > 1 && !grupoSelecionado && (
                      <div className="mt-2 text-center">
                        <span className="bg-navy/80 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg">
                          + {grupos.length - 1} pedidos próximos
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="relative z-10 px-4 pt-4 overflow-y-auto h-full pb-20">
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
      )}

      <div className="relative z-10">
        <AnunciosEntregador />
      </div>
    </EntregadorShell>
  );
}
