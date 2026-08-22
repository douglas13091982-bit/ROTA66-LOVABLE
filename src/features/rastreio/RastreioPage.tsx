import { useBranding } from "@/hooks/use-branding";
import { useRastreio } from "./hooks/use-rastreio";
import { useSomChegada } from "./hooks/use-som-chegada";
import { RastreioHeader } from "./components/RastreioHeader";
import { CodigoEntregaCard } from "./components/CodigoEntregaCard";
import { EntregueCard, CanceladoCard } from "./components/StatusCards";
import { StatusTimeline } from "./components/StatusTimeline";
import { EnderecoEntregaCard } from "./components/EnderecoEntregaCard";
import { RastreioMapa } from "./components/RastreioMapa";

export function RastreioPage({ pedidoId }: { pedidoId: string }) {
  const { logoUrl, nomeSistema } = useBranding();
  const { data, isLoading, error } = useRastreio(pedidoId);
  // Alerta sonoro no instante em que o entregador chega no local.
  useSomChegada(data?.chegou_entrega_at);


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (error || !data) return null;

  const isCancelado = data.status === "cancelado";
  const isEntregue = data.status === "entregue";
  const isColetado = data.status === "coletado";
  const isEmRota = ["em_rota", "coletado"].includes(data.status);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto p-5 space-y-5">
        <RastreioHeader
          logoUrl={logoUrl}
          nomeSistema={nomeSistema}
          lojaNome={data.loja_nome}
          numero={data.numero}
          clienteNome={data.cliente_nome}
          entregadorNome={data.entregador_nome}
          entregadorFoto={data.entregador_foto}
          codigoEntrega={data.codigo_entrega}
          isColetado={isColetado}
        />

        {isEmRota && !isEntregue && !isCancelado && (
          <RastreioMapa 
            pedidoId={pedidoId}
            lojaCoord={data.loja_lat && data.loja_lng ? { lat: data.loja_lat, lng: data.loja_lng } : null}
            entregaCoord={data.entrega_lat && data.entrega_lng ? { lat: data.entrega_lat, lng: data.entrega_lng } : null}
            entregadorId={data.entregador_id}
          />
        )}

        {/* CodigoEntregaCard removido daqui, integrado no Header */}

        {isEntregue && <EntregueCard confirmadaEm={data.entrega_confirmada_em} />}

        {!isCancelado && (
          <StatusTimeline
            status={data.status}
            chegouEntrega={!!data.chegou_entrega_at}
          />
        )}

        {isCancelado && <CanceladoCard />}

        <EnderecoEntregaCard
          endereco={data.endereco_entrega}
          complemento={data.complemento}
        />
      </div>
    </div>
  );
}
