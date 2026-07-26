import { useBranding } from "@/hooks/use-branding";
import { useRastreio } from "./hooks/use-rastreio";
import { RastreioHeader } from "./components/RastreioHeader";
import { CodigoEntregaCard } from "./components/CodigoEntregaCard";
import { EntregueCard, CanceladoCard } from "./components/StatusCards";
import { StatusTimeline } from "./components/StatusTimeline";
import { EnderecoEntregaCard } from "./components/EnderecoEntregaCard";

export function RastreioPage({ pedidoId }: { pedidoId: string }) {
  const { logoUrl, nomeSistema } = useBranding();
  const { data, isLoading, error } = useRastreio(pedidoId);

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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-5 space-y-5">
        <RastreioHeader
          logoUrl={logoUrl}
          nomeSistema={nomeSistema}
          lojaNome={data.loja_nome}
          numero={data.numero}
          clienteNome={data.cliente_nome}
        />

        {isColetado && data.codigo_entrega && (
          <CodigoEntregaCard codigo={data.codigo_entrega} />
        )}

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
