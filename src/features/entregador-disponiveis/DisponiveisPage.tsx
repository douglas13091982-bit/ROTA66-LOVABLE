import { useCallback, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Package } from "lucide-react";
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
      topFixed={<GanhoHojeCard valor={ganhoHoje} />}
    >
      {!rotaAtivaResolvida ? (
        <div className="bg-[#0d2c54] border border-white/10 rounded-2xl p-8 text-center shadow-xl">
          <p className="text-sm font-black text-white uppercase tracking-widest animate-pulse">Carregando…</p>
        </div>
      ) : temRotaAtiva ? (
        <RotaAtivaEstado onVerRota={() => navigate({ to: "/entregador/ativos" })} />
      ) : !estouOnline ? (
        <div className="text-center py-20 px-4">
          <div className="mx-auto mb-6 w-32 h-32 grid place-items-center opacity-40">
            <Package className="h-28 w-28" style={{ color: "#0d2c54", strokeWidth: 1 }} />
          </div>
          <p className="text-[18px] font-black text-[#0d2c54] uppercase tracking-wider">
            Você está desconectado
          </p>
          <p className="text-xs mt-2 font-medium" style={{ color: "#6b7688" }}>
            Clique em conectar abaixo para ver pedidos.
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
