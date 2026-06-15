import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EntregadorShell } from "@/components/EntregadorShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useTaxaSistema, liquidoEntregador } from "@/hooks/use-taxa-sistema";
import { Phone, MapPin, Bike, Navigation, KeyRound, Loader2, PartyPopper, X, TrendingUp, CreditCard, Banknote, QrCode } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ChatPedidoButton } from "@/components/ChatPedido";

export const Route = createFileRoute("/_authenticated/entregador/ativos")({
  validateSearch: z.object({ destaque: z.string().uuid().optional() }),
  component: AtivosPage,
});


function AtivosPage() {
  const { user } = useAuth();
  const { destaque } = Route.useSearch();
  const taxaSistema = useTaxaSistema();
  const [dismissedFinalizado, setDismissedFinalizado] = useState(false);
  // IDs do lote ativo corrente — só esses entram no resumo final
  const loteAtivoRef = useRef<string[]>([]);
  const [loteFinalizado, setLoteFinalizado] = useState<string[]>([]);

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ["pedidos-ativos", user?.id],
    enabled: !!user?.id,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .eq("entregador_id", user!.id)
        .in("status", ["em_rota", "coletado"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Rastreia o lote ativo. Ao zerar, congela seus IDs como "finalizados".
  useEffect(() => {
    if (!pedidos) return;
    if (pedidos.length > 0) {
      const novos = pedidos.map((p) => p.id);
      loteAtivoRef.current = Array.from(new Set([...loteAtivoRef.current, ...novos]));
      setDismissedFinalizado(false);
      setLoteFinalizado([]);
    } else if (loteAtivoRef.current.length > 0) {
      setLoteFinalizado(loteAtivoRef.current);
      loteAtivoRef.current = [];
    }
  }, [pedidos]);

  // Busca apenas os pedidos do lote finalizado (não todos dos últimos 10 min)
  const { data: recentesEntregues } = useQuery({
    queryKey: ["pedidos-lote-finalizado", user?.id, loteFinalizado.join(",")],
    enabled: !!user?.id && loteFinalizado.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .eq("entregador_id", user!.id)
        .eq("status", "entregue")
        .in("id", loteFinalizado)
        .order("entrega_confirmada_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Agrupa por rota_id; sem rota_id, faz fallback por loja + endereço de coleta
  const norm = (s: string | null | undefined) =>
    (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  // Agrupa SEMPRE pela mesma loja + mesmo ponto de coleta (ignora rota_id),
  // pois pedidos da mesma coleta = mesma ida do entregador à loja.
  const rotas = (pedidos ?? []).reduce<Record<string, any[]>>((acc, p) => {
    const coletaKey =
      p.endereco_coleta_lat != null && p.endereco_coleta_lng != null
        ? `${Number(p.endereco_coleta_lat).toFixed(4)},${Number(p.endereco_coleta_lng).toFixed(4)}`
        : norm(p.endereco_coleta);
    const key = `addr:${p.loja_id}|${coletaKey}`;
    (acc[key] ||= []).push(p);
    return acc;
  }, {});
  Object.values(rotas).forEach((arr) =>
    arr.sort((a, b) => {
      const oa = a.rota_ordem ?? 999;
      const ob = b.rota_ordem ?? 999;
      if (oa !== ob) return oa - ob;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    })
  );

  const semAtivos = !!pedidos && pedidos.length === 0;
  const mostrarFinalizado =
    semAtivos && !dismissedFinalizado && (recentesEntregues?.length ?? 0) > 0;
  const totalGanhoLote = (recentesEntregues ?? []).reduce(
    (s, p) => s + liquidoEntregador(p.taxa_entrega, taxaSistema),
    0
  );

  return (
    <EntregadorShell title="Minhas Entregas">
      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      {mostrarFinalizado && (
        <div className="relative overflow-hidden rounded-2xl glass shadow-elevated p-8 text-center mb-6 border border-emerald-500/40">
          <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-emerald-500/25 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />
          <button
            onClick={() => setDismissedFinalizado(true)}
            aria-label="Fechar"
            className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-card/60 transition z-10"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="relative flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center backdrop-blur-sm border border-emerald-400/40 shadow-[0_10px_30px_-8px_oklch(0.7_0.18_155_/_0.5)]">
              <PartyPopper className="h-8 w-8 text-emerald-400" />
            </div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-400 font-bold">
              Entregas Finalizadas
            </div>
            <div className="text-sm text-muted-foreground">
              {recentesEntregues!.length}{" "}
              {recentesEntregues!.length === 1 ? "entrega concluída" : "entregas concluídas"}
            </div>
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
                Você ganhou
              </div>
              <div className="font-display text-6xl md:text-7xl text-emerald-400 leading-none drop-shadow-[0_4px_24px_oklch(0.7_0.18_155_/_0.45)]">
                R$ {totalGanhoLote.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {semAtivos && !mostrarFinalizado && (
        <div className="relative overflow-hidden rounded-2xl glass shadow-soft p-12 text-center">
          <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <Bike className="relative h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="relative font-display text-2xl tracking-[0.06em] mb-2">Nenhuma entrega em andamento</p>
          <p className="relative text-muted-foreground text-sm">Vá para a aba Pedidos e aceite um pedido.</p>
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(rotas).map(([key, items]) => (
          <RotaBlock key={key} items={items} destaque={destaque} />
        ))}
      </div>
    </EntregadorShell>
  );
}


function RotaBlock({ items, destaque }: { items: any[]; destaque?: string }) {
  if (items.length === 1) {
    return <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><PedidoCard pedido={items[0]} destaque={destaque} /></div>;
  }

  const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const coletaRef = items[0];
  const mesmaColeta = items.every(
    (p) => norm(p.endereco_coleta) === norm(coletaRef.endereco_coleta)
  );

  const pendentesColeta = items.filter((p) => p.status === "em_rota");
  const pendentesEntrega = items.filter((p) => p.status === "coletado");

  // Fase 1: ainda há pedidos para coletar e todos compartilham o mesmo ponto de coleta
  // → exibe APENAS um card consolidado de coleta.
  if (mesmaColeta && pendentesColeta.length > 0) {
    return (
      <ColetaConsolidadaCard
        pedidos={pendentesColeta}
        totalRota={items.length}
      />
    );
  }

  // Fase 2: já coletou tudo. Mostra entregas UMA por vez (a próxima na sequência).
  if (pendentesEntrega.length > 0) {
    const proxima = pendentesEntrega[0];
    const idxAtual = items.findIndex((p) => p.id === proxima.id);
    const restantes = pendentesEntrega.length;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between glass border border-border/40 rounded-xl px-4 py-2.5 text-[10px] uppercase tracking-[0.18em]">
          <span className="text-muted-foreground font-bold">Rota agrupada · {items.length} paradas</span>
          <span className="font-bold text-primary drop-shadow-[0_2px_8px_oklch(0.55_0.21_27_/_0.4)]">
            Entrega {idxAtual + 1}/{items.length} · faltam {restantes}
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="relative">
            <span className="absolute -top-2 -left-2 z-10 w-8 h-8 rounded-full bg-gradient-red text-primary-foreground font-display text-base flex items-center justify-center shadow-red border border-primary/40">
              {idxAtual + 1}
            </span>
            <PedidoCard pedido={proxima} destaque={destaque} agrupado />
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function ColetaConsolidadaCard({ pedidos, totalRota }: { pedidos: any[]; totalRota: number }) {
  const [revealed, setRevealed] = useState(false);
  const ref = pedidos[0];
  const codigo = ref.codigo_coleta;
  const endereco = ref.endereco_coleta;
  const mapsUrl = endereco
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco)}`
    : null;

  return (
    <div className="relative p-5 md:p-6">
      <div className="relative">
        <div className="flex flex-col items-center text-center mb-4 gap-2">
          <div>
            <div className="text-sm uppercase tracking-[0.22em] text-white/50">Coleta agrupada</div>
            <div className="font-display text-2xl md:text-3xl tracking-[0.06em] mt-0.5 text-white">
              {pedidos.length} pedidos
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/50 mt-1.5">
              Rota com {totalRota} paradas no total
            </div>
          </div>
        </div>

        <div className="text-[10px] uppercase tracking-[0.22em] text-white/50 mt-2 mb-1.5">
          Endereço de coleta
        </div>
        <div className="flex items-start gap-3 mb-4">
          <div className="flex items-start gap-2 flex-1 min-w-0 text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white">
            <MapPin className="h-4 w-4 mt-0.5 text-white/70 shrink-0" />
            <span className="font-semibold">{endereco}</span>
          </div>
          {mapsUrl && (
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={mapsUrl}
              aria-label="Abrir rota no mapa"
              className="shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-[#da161a] text-white hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
            >
              <Navigation className="h-6 w-6" />
              <span className="text-[9px] font-bold uppercase tracking-[0.16em] mt-0.5">Mapa</span>
            </a>
          )}
        </div>

        <div className="text-[11px] text-white/50 mb-4 px-1">
          Pedidos nesta coleta:{" "}
          <span className="font-bold text-white">{pedidos.map((p) => `#${p.numero}`).join(" · ")}</span>
        </div>

        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="w-full px-5 py-4 bg-[#da161a] text-white font-bold uppercase text-sm tracking-[0.18em] rounded-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2"
          >
            Cheguei na coleta
          </button>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
            <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.22em] text-white/50 mb-2 font-bold">
              <KeyRound className="h-3.5 w-3.5" /> Confirmação de coleta
            </div>
            {[...pedidos]
              .sort((a, b) => Number(a.numero) - Number(b.numero))
              .map((p) => (
                <div
                  key={`coleta-${p.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-4 py-3"
                >
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-[0.18em] text-white/50 font-bold">Pedido</span>
                    <span className="font-display text-2xl md:text-3xl tracking-[0.06em] leading-none text-white select-all">
                      #{p.numero}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] uppercase tracking-[0.18em] text-white/50 font-bold">Coleta</span>
                    <span className="font-display text-3xl md:text-4xl tracking-[0.3em] text-[#da161a] select-all leading-none">
                      {p.codigo_coleta ?? codigo}
                    </span>
                  </div>
                </div>
              ))}
            <p className="text-[11px] text-white/50 text-center pt-1">
              Mostre estes códigos para a loja confirmar os {pedidos.length} pedidos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PedidoCard({ pedido: p, destaque, agrupado }: { pedido: any; destaque?: string; agrupado?: boolean }) {

  const qc = useQueryClient();
  const taxaSistema = useTaxaSistema();
  const [revealedColeta, setRevealedColeta] = useState(false);
  const [revealedEntrega, setRevealedEntrega] = useState(false);
  const [codigoInput, setCodigoInput] = useState("");
  const [loading, setLoading] = useState(false);
  const isColeta = p.status === "em_rota";
  const endereco = isColeta ? p.endereco_coleta : p.endereco_entrega;
  const codigoColeta = p.codigo_coleta;
  const badgeLabel = isColeta ? "Indo buscar" : "Em entrega";
  const badgeColor = isColeta ? "bg-amber-600" : "bg-indigo-600";
  const isDestaque = destaque === p.id;
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isDestaque && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isDestaque]);

  

  const confirmarEntrega = async (value: string) => {
    if (value.length !== 4) return;
    setLoading(true);
    const { error } = await supabase.rpc("confirmar_entrega", { _pedido_id: p.id, _codigo: value });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      setCodigoInput("");
      return;
    }
    toast.success("Entrega confirmada! 🎉");
    qc.invalidateQueries({ queryKey: ["pedidos-ativos"] });
  };

  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden rounded-2xl glass shadow-elevated p-5 md:p-6 transition-all duration-500 ease-premium ${
        isDestaque ? "border-2 border-primary ring-4 ring-primary/30 animate-pulse-once" : "border border-border/40"
      }`}
    >
      <div className={`absolute -top-24 -right-24 h-56 w-56 rounded-full blur-3xl pointer-events-none ${isColeta ? "bg-amber-500/15" : "bg-indigo-500/15"}`} />
      <div className="relative">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div>
            <div className="font-display text-4xl md:text-5xl tracking-[0.06em] leading-none">#{p.numero}</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1.5">
              {new Date(p.updated_at).toLocaleString("pt-BR")}
            </div>
            {p.duracao_estimada_seg != null && (
              <div className="mt-2 inline-flex items-center px-2.5 py-1 bg-indigo-500/15 backdrop-blur-sm border border-indigo-400/30 text-indigo-300 text-[10px] font-bold uppercase tracking-[0.18em] rounded-full">
                ETA {Math.max(1, Math.round(p.duracao_estimada_seg / 60))} min
                {p.distancia_metros != null && ` · ${(p.distancia_metros / 1000).toFixed(1)} km`}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] rounded-full text-white backdrop-blur-sm border shadow-soft ${isColeta ? "bg-amber-500/90 text-black border-amber-300/40" : "bg-indigo-600/90 border-indigo-400/40"}`}>
              {badgeLabel}
            </span>
            {p.entrega_paga && (
              <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] rounded-full bg-emerald-500/90 text-white border border-emerald-300/40 shadow-[0_4px_16px_-4px_oklch(0.7_0.18_155_/_0.5)]">
                Pago
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2 text-sm mb-4">
          <div className="font-bold text-base">{p.cliente_nome}</div>
          <div className="flex items-center gap-2 flex-wrap">
            <a href={`tel:${p.cliente_telefone}`} className="inline-flex items-center gap-2 text-primary hover:underline font-semibold">
              <Phone className="h-4 w-4" /> {p.cliente_telefone}
            </a>
            <ChatPedidoButton pedidoId={p.id} pedidoNumero={p.numero} senderRole="entregador" contraparteNome="Loja" />
          </div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-3 font-bold">
            {isColeta ? "Endereço de coleta" : "Endereço de entrega"}
          </div>
          <div className="flex items-start gap-3">
            <div className="flex items-start gap-2 flex-1 min-w-0 bg-background/40 backdrop-blur-sm border border-border/40 rounded-lg px-3 py-2.5">
              <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span className="font-semibold">{endereco}{!isColeta && p.complemento ? `, ${p.complemento}` : ""}</span>
            </div>
            {endereco && (
              <a
                target="_blank"
                rel="noopener noreferrer"
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco)}`}
                aria-label="Abrir rota no mapa"
                className="shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-gradient-red shadow-red text-primary-foreground hover:-translate-y-0.5 hover:shadow-[0_14px_40px_-8px_oklch(0.55_0.21_27_/_0.6)] active:scale-95 transition-all duration-300 ease-premium"
              >
                <Navigation className="h-6 w-6" />
                <span className="text-[9px] font-bold uppercase tracking-[0.16em] mt-0.5">Mapa</span>
              </a>
            )}
          </div>
        </div>

        <PagamentoBadge forma={p.forma_pagamento} troco={p.troco_para} />



        {!agrupado && (
          <div className="border-y border-border/50 py-5 mb-4 flex items-center justify-center">
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Você recebe</div>
              <div className="font-display text-5xl md:text-6xl text-emerald-400 leading-none drop-shadow-[0_4px_24px_oklch(0.7_0.18_155_/_0.45)]">
                R$ {liquidoEntregador(p.taxa_entrega, taxaSistema).toFixed(2)}
              </div>
              {Number((p as any).bonus_entregador ?? 0) > 0 && (
                <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/90 text-white text-sm font-bold uppercase tracking-[0.14em] rounded-full shadow-[0_8px_24px_-6px_oklch(0.7_0.18_155_/_0.5)] backdrop-blur-sm border border-emerald-300/40">
                  <TrendingUp className="h-4 w-4" />
                  + R$ {Number((p as any).bonus_entregador).toFixed(2)} de bônus
                </div>
              )}
            </div>
          </div>
        )}

        {isColeta ? (
          !revealedColeta ? (
            <button
              onClick={() => setRevealedColeta(true)}
              className="w-full px-5 py-4 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase text-sm tracking-[0.18em] rounded-xl hover:-translate-y-0.5 hover:shadow-[0_14px_40px_-8px_oklch(0.55_0.21_27_/_0.6)] active:scale-[0.98] transition-all duration-300 ease-premium flex items-center justify-center gap-2"
            >
              Cheguei na coleta
            </button>
          ) : (
            <div className="rounded-xl border-2 border-primary/60 bg-primary/10 backdrop-blur-sm p-5 text-center shadow-soft">
              <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2 font-bold">
                <KeyRound className="h-3.5 w-3.5" /> Código de coleta
              </div>
              <div className="font-display text-5xl md:text-6xl tracking-[0.4em] text-primary mb-2 select-all drop-shadow-[0_4px_20px_oklch(0.55_0.21_27_/_0.5)]">
                {codigoColeta}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Mostre este código para a loja confirmar a coleta.
              </p>
            </div>
          )
        ) : !revealedEntrega ? (
          <button
            onClick={() => setRevealedEntrega(true)}
            className="w-full px-5 py-4 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase text-sm tracking-[0.18em] rounded-xl hover:-translate-y-0.5 hover:shadow-[0_14px_40px_-8px_oklch(0.55_0.21_27_/_0.6)] active:scale-[0.98] transition-all duration-300 ease-premium flex items-center justify-center gap-2"
          >
            Cheguei na entrega
          </button>
        ) : (
          <div className="rounded-xl border-2 border-primary/60 bg-primary/10 backdrop-blur-sm p-5 space-y-3 shadow-soft">
            <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-bold">
              <KeyRound className="h-3.5 w-3.5" /> Digite o código do cliente
            </div>
            <div className="flex justify-center">
              <InputOTP
                maxLength={4}
                value={codigoInput}
                onChange={(v) => {
                  setCodigoInput(v);
                  if (v.length === 4) confirmarEntrega(v);
                }}
                disabled={loading}
                inputMode="numeric"
                pattern="[0-9]*"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="h-14 w-12 text-2xl" />
                  <InputOTPSlot index={1} className="h-14 w-12 text-2xl" />
                  <InputOTPSlot index={2} className="h-14 w-12 text-2xl" />
                  <InputOTPSlot index={3} className="h-14 w-12 text-2xl" />
                </InputOTPGroup>
              </InputOTP>
            </div>
            {loading && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Confirmando...
              </div>
            )}
            <p className="text-[11px] text-muted-foreground text-center">
              Peça ao cliente o código de 4 dígitos que aparece na página de rastreio.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PagamentoBadge({ forma, troco }: { forma?: string | null; troco?: number | null }) {
  if (!forma) return null;
  const map: Record<string, { label: string; icon: typeof CreditCard; cls: string; hint?: string }> = {
    cartao: {
      label: "Cartão na entrega",
      icon: CreditCard,
      cls: "bg-amber-500/15 border-amber-400/40 text-amber-300",
      hint: "Você precisará fazer voltar para devolver a maquininha.",
    },
    cartao_credito: {
      label: "Cartão na entrega",
      icon: CreditCard,
      cls: "bg-amber-500/15 border-amber-400/40 text-amber-300",
      hint: "Você precisará fazer voltar para devolver a maquininha.",
    },
  };
  const info = map[forma];
  if (!info) return null;
  const Icon = info.icon;
  return (
    <div className={`mb-4 rounded-xl border backdrop-blur-sm px-3 py-2.5 ${info.cls}`}>
      <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em]">
        <Icon className="h-4 w-4" />
        <span>{info.label}</span>
      </div>
      {info.hint && (
        <p className="text-[11px] mt-1 opacity-80 normal-case tracking-normal font-semibold">{info.hint}</p>
      )}
    </div>
  );
}
