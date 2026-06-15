import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, MapPin, KeyRound, CheckCircle2, Truck, ChefHat, Bike } from "lucide-react";
import { useBranding } from "@/hooks/use-branding";
import { formatDateTime } from "@/lib/format";


export const Route = createFileRoute("/rastreio/$pedidoId")({
  component: RastreioPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <p className="font-display text-2xl mb-2">Não foi possível carregar</p>
        <p className="text-muted-foreground text-sm">{error.message}</p>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center p-6">
      <p className="font-display text-2xl">Pedido não encontrado</p>
    </div>
  ),
});

const STATUS_STEPS = [
  { key: "novo", label: "Recebido", icon: Package },
  { key: "aceito", label: "Aceito", icon: CheckCircle2 },
  { key: "em_preparo", label: "Em preparo", icon: ChefHat },
  { key: "pronto", label: "Pronto", icon: Package },
  { key: "em_rota", label: "Saiu para coleta", icon: Bike },
  { key: "coletado", label: "Em rota de entrega", icon: Truck },
  { key: "entregue", label: "Entregue", icon: CheckCircle2 },
];

function RastreioPage() {
  const { pedidoId } = Route.useParams();
  const qc = useQueryClient();
  const { logoUrl, nomeSistema } = useBranding();

  const { data, isLoading, error } = useQuery({
    queryKey: ["rastreio", pedidoId],
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rastrear_pedido", { _pedido_id: pedidoId });
      if (error) throw error;
      if (!data || data.length === 0) throw notFound();
      return data[0];
    },
  });

  // Realtime — atualiza assim que a loja confirma a coleta ou o entregador confirma a entrega
  useEffect(() => {
    const channel = supabase
      .channel(`rastreio-${pedidoId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pedidos", filter: `id=eq.${pedidoId}` },
        () => qc.invalidateQueries({ queryKey: ["rastreio", pedidoId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [pedidoId, qc]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (error || !data) return null;

  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === data.status);
  const isCancelado = data.status === "cancelado";
  const isEntregue = data.status === "entregue";
  const isColetado = data.status === "coletado";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-5 space-y-5">
        <div className="flex justify-center pt-4">
          <img
            src={logoUrl}
            alt={nomeSistema}
            className="h-16 w-auto object-contain"
          />
        </div>

        <header className="text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{data.loja_nome}</p>
          <h1 className="font-display text-3xl tracking-wide">Pedido #{data.numero}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Olá, {data.cliente_nome}
          </p>
        </header>

        {/* Código de entrega — só aparece quando o entregador está a caminho */}
        {isColetado && data.codigo_entrega && (
          <div className="rounded-lg border-2 border-primary bg-primary/5 p-5 text-center shadow-card">
            <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-2">
              <KeyRound className="h-3.5 w-3.5" /> Seu código de entrega
            </div>
            <div className="font-display text-6xl tracking-[0.4em] text-primary mb-2 select-all">
              {data.codigo_entrega}
            </div>
            <p className="text-xs text-muted-foreground">
              Informe este código ao entregador quando ele chegar para confirmar a entrega.
            </p>
          </div>
        )}

        {isEntregue && (
          <div className="rounded-lg border-2 border-green-600 bg-green-600/5 p-5 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto mb-2" />
            <p className="font-display text-2xl tracking-wide">Pedido entregue!</p>
            <p className="text-xs text-muted-foreground mt-1">
              {data.entrega_confirmada_em && formatDateTime(data.entrega_confirmada_em)}
            </p>
          </div>
        )}

        {/* Status timeline */}
        {!isCancelado && (
          <div className="bg-card border border-border rounded-lg p-5 shadow-card">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Status do pedido</p>
            <div className="space-y-3">
              {STATUS_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const done = idx <= currentStepIdx;
                const current = idx === currentStepIdx;
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                        done
                          ? current
                            ? "bg-gradient-red shadow-red text-primary-foreground"
                            : "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={`text-sm ${current ? "font-bold" : done ? "" : "text-muted-foreground"}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isCancelado && (
          <div className="rounded-lg border-2 border-destructive/50 bg-destructive/5 p-5 text-center">
            <p className="font-display text-2xl text-destructive">Pedido cancelado</p>
          </div>
        )}

        <div className="bg-card border border-border rounded-lg p-5 shadow-card text-sm space-y-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Endereço de entrega</div>
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <span>{data.endereco_entrega}{data.complemento ? `, ${data.complemento}` : ""}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
