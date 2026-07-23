import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { subscribeLazy } from "@/lib/realtime-lazy";
import {
  DEFAULT_SOM,
  fetchConfigSom,
  instalarDesbloqueioAutomatico,
  precarregarSom,
  tocarNotificacao,
} from "@/lib/notificacao-som";

export type Pedido = { id: string; [k: string]: any };

/**
 * Carrega a lista de pedidos da loja (últimos 100, ordem desc).
 */
export function usePedidosLoja(lojaId: string | undefined) {
  return useQuery({
    queryKey: ["pedidos", lojaId],
    enabled: !!lojaId,
    refetchInterval: 30_000, // fallback se o canal Realtime cair
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*, lojas:loja_id(taxa_por_pedido, plano_mensal_ativo)")
        .eq("loja_id", lojaId!)
        // Oculta pedidos online enquanto o pagamento não é confirmado pelo MP.
        // Assim que o webhook aprovar, o status muda para "em_preparo" e o pedido aparece.
        .neq("status", "aguardando_pagamento")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        ...p,
        loja_taxa_por_pedido:
          p.taxa_por_pedido_aplicada != null
            ? Number(p.taxa_por_pedido_aplicada)
            : Number(p.lojas?.taxa_por_pedido ?? 0),
        loja_plano_mensal_ativo: Boolean(p.lojas?.plano_mensal_ativo),
      })) as Pedido[];

    },
  });
}

/** Inscreve em mudanças realtime nos pedidos da loja e invalida a query. */
export function usePedidosRealtime(lojaId: string | undefined) {
  const qc = useQueryClient();
  const somCfgRef = useRef(DEFAULT_SOM);

  useEffect(() => {
    instalarDesbloqueioAutomatico();
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    fetchConfigSom("loja").then((cfg) => {
      if (cancelled) return;
      somCfgRef.current = cfg;
      if (cfg.audio_path) {
        precarregarSom(cfg);
        // URL assinada do Storage expira em 1h — renovamos a cada 30 min.
        interval = setInterval(() => precarregarSom(cfg), 30 * 60_000);
      }
    });
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!lojaId) return;
    return subscribeLazy(() =>
      supabase
        .channel(`pedidos-${lojaId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "pedidos", filter: `loja_id=eq.${lojaId}` },
          (payload) => {
            qc.invalidateQueries({ queryKey: ["pedidos", lojaId] });
            if (payload.eventType === "INSERT") {
              toast.success("🚨 Novo pedido recebido!");
              const cfg = { ...somCfgRef.current, ativo: true, volume: Math.max(somCfgRef.current.volume ?? 0.6, 1) };
              tocarNotificacao(cfg);
            }
          },
        )
        .subscribe() as never,
    );
  }, [lojaId, qc]);
}

/** Notifica novas mensagens de entregador no chat dos pedidos da loja. */
export function useChatMensagensEntregador(opts: {
  lojaId: string | undefined;
  pedidos: Pedido[] | undefined;
  detalheIdRef: React.MutableRefObject<string | null>;
  pedidosRef: React.MutableRefObject<Pedido[]>;
  onAbrir: (pedido: Pedido) => void;
}) {
  const { lojaId, pedidos, detalheIdRef, pedidosRef, onAbrir } = opts;
  const qc = useQueryClient();

  useEffect(() => {
    if (!lojaId || !pedidos || pedidos.length === 0) return;
    return subscribeLazy(() =>
      supabase
        .channel(`chat-msgs-loja-${lojaId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "pedido_mensagens" },
          (payload) => {
            const msg: any = payload.new;
            if (!msg || msg.sender_role !== "entregador") return;
            const pedido = pedidosRef.current.find((p) => p.id === msg.pedido_id);
            if (!pedido) return;
            if (detalheIdRef.current === msg.pedido_id) return;
            const preview = String(msg.mensagem ?? "").slice(0, 80);
            toast.message(`💬 Nova mensagem · Pedido #${pedido.numero}`, {
              description: preview,
              duration: 10000,
              action: {
                label: "Abrir",
                onClick: () => {
                  const atual = pedidosRef.current.find((p) => p.id === msg.pedido_id) ?? pedido;
                  onAbrir(atual);
                },
              },
            });
            qc.invalidateQueries({ queryKey: ["chat-nao-lidas-map"] });
          },
        )
        .subscribe() as never,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaId, !!pedidos?.length, qc]);
}

const CINCO_MIN_MS = 5 * 60 * 1000;
const TICK_INTERVALO_MS = 30_000;

/** Auto-arquiva pedidos entregues 5min após confirmação. */
export function useAutoArquivar(
  lojaId: string | undefined,
  pedidos: Pedido[] | undefined,
  pedidosRef: React.MutableRefObject<Pedido[]>,
) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!lojaId || !pedidos || pedidos.length === 0) return;

    const tick = async () => {
      const agora = Date.now();
      const paraArquivar = (pedidosRef.current ?? []).filter((p) => {
        if (p.arquivado) return false;
        if (p.status !== "entregue") return false;
        const ref = p.entrega_confirmada_em ?? p.updated_at;
        if (!ref) return false;
        return agora - new Date(ref).getTime() >= CINCO_MIN_MS;
      });
      if (paraArquivar.length === 0) return;
      const ids = paraArquivar.map((p) => p.id);
      const { error } = await supabase.from("pedidos").update({ arquivado: true }).in("id", ids);
      if (!error) {
        qc.invalidateQueries({ queryKey: ["pedidos", lojaId] });
      }
    };

    tick();
    const id = setInterval(tick, TICK_INTERVALO_MS);
    return () => clearInterval(id);
  }, [lojaId, pedidos, pedidosRef, qc]);
}

/** Raio (km) configurado pelo super admin para agrupar entregas no mesmo lote. */
export function useRaioAgrupamentoKm(): number {
  const { data } = useQuery({
    queryKey: ["config-roteirizacao-raio"],
    queryFn: async () => {
      const { data } = await supabase
        .from("config_roteirizacao")
        .select("raio_agrupamento_preparo_meters")
        .limit(1)
        .maybeSingle();
      return data;
    },
    staleTime: 60_000,
  });
  return (data?.raio_agrupamento_preparo_meters ?? 1500) / 1000;
}

/** Mantém um ref sincronizado com o valor atual. */
export function useSyncedRef<T>(value: T): React.MutableRefObject<T> {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
