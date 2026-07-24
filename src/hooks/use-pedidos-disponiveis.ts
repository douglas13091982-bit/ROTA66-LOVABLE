/**
 * Hook que encapsula TODAS as queries e realtime do entregador na tela de
 * pedidos disponíveis. Responsabilidades:
 *   - Buscar lojas vinculadas, pedidos vinculados, pool externo
 *   - Detectar rota ativa (bloqueia novos pedidos)
 *   - Carregar perfil externo, ganho do dia, tarifas globais
 *   - Mesclar e agrupar pedidos
 *   - Subscrever realtime
 */

import { useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { subscribeLazy } from "@/lib/realtime-lazy";
import { useAuth } from "@/hooks/use-auth";
import { haversineKm } from "@/lib/geo";
import { liquidoEntregador } from "@/hooks/use-taxa-sistema";
import {
  agruparPedidosPorRota,
  mesclarPedidosDisponiveis,
} from "@/lib/pedido-agrupador";
import { calcularTarifaPorFaixa } from "@/lib/tarifa-calculator";
import type { PedidoDisponivel, TarifaFaixa } from "@/types/pedido";
import type { Database } from "@/integrations/supabase/types";

const POOL_REFETCH_MS = 5_000;
const ROTA_ATIVA_REFETCH_MS = 15_000;
const GANHO_REFETCH_MS = 10_000;
type TipoVeiculo = Database["public"]["Enums"]["tipo_veiculo"];

export type UsePedidosDisponiveisResult = {
  grupos: ReturnType<typeof agruparPedidosPorRota>;
  isLoading: boolean;
  temRotaAtiva: boolean;
  rotaAtivaResolvida: boolean;
  semVinculoNemExterno: boolean;
  ganhoHoje: number;
  taxaParaExibir: (p: PedidoDisponivel) => number;
  estouOnline: boolean;
};



export function usePedidosDisponiveis(
  dismissed: string[],
): UsePedidosDisponiveisResult {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const { data: perfilEntregador } = useQuery({
    queryKey: ["meu-perfil-externo", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("aceita_pedidos_externos, tipo_veiculo")
        .eq("id", userId!)
        .maybeSingle();
      const perfil = data as {
        aceita_pedidos_externos?: boolean | null;
        tipo_veiculo?: string | null;
      } | null;
      return {
        aceitaPedidosExternos: !!perfil?.aceita_pedidos_externos,
        tipoVeiculo: (perfil?.tipo_veiculo || "moto") as TipoVeiculo,
      };
    },
  });
  const aceitaPedidosExternos = !!perfilEntregador?.aceitaPedidosExternos;
  const tipoVeiculo: TipoVeiculo = perfilEntregador?.tipoVeiculo || "moto";

  // Status online do próprio entregador. Quando offline, nenhum pedido deve
  // ser oferecido — nem na lista, nem via popup/realtime. A query é leve e
  // refetcha junto com a do StatusIndicator graças ao realtime.
  const { data: meuStatus } = useQuery({
    queryKey: ["entregador-self-status", userId],
    enabled: !!userId,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("entregador_status")
        .select("online, updated_at")
        .eq("entregador_id", userId!)
        .maybeSingle();
      return data;
    },
  });
  const estouOnline = !!meuStatus?.online;
  const estouOnlineRef = useRef(estouOnline);
  estouOnlineRef.current = estouOnline;

  // Realtime no próprio status: assim que o toggle grava online=false,
  // o estado flipa AQUI na mesma hora — sem esperar o refetch de 15s —
  // e os grupos somem da tela imediatamente.
  useEffect(() => {
    if (!userId) return;
    return subscribeLazy(() =>
      supabase
        .channel(`self-status-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "entregador_status",
            filter: `entregador_id=eq.${userId}`,
          },
          (payload) => {
            const novo = (payload.new ?? null) as { online?: boolean; updated_at?: string } | null;
            if (novo) {
              qc.setQueryData(["entregador-self-status", userId], novo);
            } else {
              qc.invalidateQueries({ queryKey: ["entregador-self-status", userId] });
            }
          }
        )
        .subscribe() as never,
    );
  }, [userId, qc]);





  const { data: rotaAtivaCount, isFetched: rotaAtivaFetched } = useQuery({
    queryKey: ["entregador-rota-ativa", userId],
    enabled: !!userId,
    refetchInterval: ROTA_ATIVA_REFETCH_MS,
    staleTime: ROTA_ATIVA_REFETCH_MS,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("entregador_id", userId!)
        .in("status", ["em_rota", "coletado"]);
      if (error) throw error;
      return count ?? 0;
    },
  });
  const temRotaAtiva = (rotaAtivaCount ?? 0) > 0;
  const rotaAtivaResolvida = rotaAtivaCount !== undefined || rotaAtivaFetched;

  // Realtime: quando um pedido do entregador muda de status (ex: aceitou,
  // coletou, entregou), invalida a contagem para o banner "rota ativa"
  // aparecer/sumir instantaneamente sem esperar o refetch de 15s.
  useEffect(() => {
    if (!userId) return;
    return subscribeLazy(() =>
      supabase
        .channel(`rota-ativa-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "pedidos",
            filter: `entregador_id=eq.${userId}`,
          },
          () => {
            qc.invalidateQueries({ queryKey: ["entregador-rota-ativa", userId] });
          },
        )
        .subscribe() as never,
    );
  }, [userId, qc]);


  const { data: lojaIds } = useQuery({
    queryKey: ["minhas-lojas-vinculadas", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loja_entregadores")
        .select("loja_id")
        .eq("entregador_id", userId!)
        .eq("ativo", true);
      if (error) throw error;
      return (data ?? []).map((r) => r.loja_id);
    },
  });

  // Pool unificado: a RPC `pedidos_pool_externo` aplica o escopo configurado
  // no admin (somente_vinculados / somente_externos / vinculados_e_externos).
  const { data: pedidosExternos, isLoading: loadingExt } = useQuery({
    queryKey: ["pedidos-pool-externo", userId],
    enabled: !!userId && !temRotaAtiva && estouOnline,
    refetchInterval: POOL_REFETCH_MS,
    queryFn: async () => {
      const { data, error } = await (
        supabase.rpc as unknown as (
          fn: string,
        ) => Promise<{ data: PedidoDisponivel[] | null; error: Error | null }>
      )("pedidos_pool_externo");
      if (error) throw error;
      // Marca todos como "externos" — o aceite agora é único (RPC).
      return (data ?? []).map((p) => ({ ...p, _externo: true }));
    },
  });

  const { data: ganhoHoje } = useQuery({
    queryKey: ["ganho-hoje", userId],
    enabled: !!userId,
    refetchInterval: GANHO_REFETCH_MS,
    queryFn: async () => {
      const { data, error } = await (
        supabase.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: number | string | null; error: Error | null }>
      )("get_ganho_hoje", { _entregador_id: userId! });
      if (error) throw error;
      return Number(data ?? 0);
    },
  });

  const { data: tarifasGlobais } = useQuery({
    queryKey: ["tarifas-globais-entregador"],
    enabled: !!userId,
    queryFn: async () => {
      // Tarifa única padrão — sem distinção por tipo de veículo.
      const { data, error } = await supabase
        .from("tarifas_globais")
        .select("*")
        .eq("ativa", true);
      if (error) throw error;
      return (data ?? []) as unknown as TarifaFaixa[];
    },
  });

  // Realtime — ofertas externas para mim
  useEffect(() => {
    if (!userId) return;
    return subscribeLazy(() =>
      supabase
        .channel(`minhas-ofertas-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "pedido_ofertas",
            filter: `entregador_id=eq.${userId}`,
          },
          (payload) => {
            if (!estouOnlineRef.current) return;
            qc.invalidateQueries({ queryKey: ["pedidos-pool-externo", userId] });
            if (payload.eventType === "INSERT") {
              toast.success("🚨 Nova oferta de pedido disponível!");
            }
          },
        )
        .subscribe() as never,
    );
  }, [userId, qc]);

  // Realtime — qualquer pedido novo invalida o pool unificado
  useEffect(() => {
    if (!userId) return;
    return subscribeLazy(
      () =>
        supabase
          .channel(`entregador-pedidos-${userId}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "pedidos" },
            (payload) => {
              if (!estouOnlineRef.current) return;
              qc.invalidateQueries({ queryKey: ["pedidos-pool-externo", userId] });

            const novo = payload.new as {
              id?: string;
              numero?: number | string | null;
              status?: string;
              entregador_id?: string | null;
            } | null;
            const anterior = payload.old as {
              status?: string;
              entregador_id?: string | null;
            } | null;
            const ficouPronto =
              (payload.eventType === "INSERT" || payload.eventType === "UPDATE") &&
              novo?.status === "pronto" &&
              !novo?.entregador_id;
            if (ficouPronto) {
              toast.success("🚨 Novo pedido pronto para retirar!");
              mostrarNotificacaoLocalNovoPedido(novo, userId);
            }
            // Se um pedido meu mudou (ex.: virou "entregue"), atualiza ganhos do dia.
            const pedidoMeu =
              novo?.entregador_id === userId || anterior?.entregador_id === userId;
            if (pedidoMeu) {
              qc.invalidateQueries({ queryKey: ["ganho-hoje", userId] });
            }
          },
        )
        .subscribe() as never,
      () => {
        // Resync ao voltar de background: eventos perdidos enquanto o WS estava suspenso.
        qc.invalidateQueries({ queryKey: ["pedidos-pool-externo", userId] });
        qc.invalidateQueries({ queryKey: ["entregador-rota-ativa", userId] });
        qc.invalidateQueries({ queryKey: ["ganho-hoje", userId] });
        qc.invalidateQueries({ queryKey: ["entregador-self-status", userId] });
      },
    );
  }, [userId, qc]);



  const pedidos = useMemo(
    () => pedidosExternos ?? [],
    [pedidosExternos],
  );

  const grupos = useMemo(
    () => (estouOnline ? agruparPedidosPorRota(pedidos, dismissed) : []),
    [pedidos, dismissed, estouOnline],
  );



  const taxaParaExibir = useMemo(
    () => criarCalculadorTaxaExibida(tarifasGlobais),
    [tarifasGlobais],
  );

  return {
    grupos,
    isLoading: loadingExt,
    temRotaAtiva,
    rotaAtivaResolvida,
    semVinculoNemExterno: (!lojaIds || lojaIds.length === 0) && !aceitaPedidosExternos,
    ganhoHoje: ganhoHoje ?? 0,
    taxaParaExibir,
    estouOnline,
  };

}

function mostrarNotificacaoLocalNovoPedido(
  pedido: { id?: string; numero?: number | string | null } | null,
  userId?: string,
) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const tag = `rota66-pedido-local-${pedido?.id || pedido?.numero || Date.now()}`;
  const title = "🚨 Nova entrega disponível";
  const body = pedido?.numero
    ? `Pedido #${pedido.numero} disponível para aceitar.`
    : "Toque para ver os pedidos disponíveis.";
  const data = { url: "/entregador/disponiveis" };

  void (async () => {
    try {
      const reg = await navigator.serviceWorker?.getRegistration?.("/sw-push.js");
      if (reg?.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          vibrate: [200, 80, 200],
          tag,
          renotify: true,
          requireInteraction: true,
          data,
        } as NotificationOptions & { vibrate: number[]; renotify: boolean });
        return;
      }
    } catch {}

    try {
      new Notification(title, {
        body,
        icon: "/icons/icon-192.png",
        tag,
        data,
      });
    } catch (err) {
      console.warn("[push] falha ao exibir notificação local", err, userId);
    }
  })();
}

function criarCalculadorTaxaExibida(
  tarifasGlobais: TarifaFaixa[] | undefined,
) {
  return (p: PedidoDisponivel): number => {
    // A taxa por pedido do plano é sempre somada à tarifa do cliente e
    // depois descontada do líquido do entregador — o plano mensal pode
    // cobrar mensalidade E taxa por pedido. Manter em paridade com
    // liquidoEntregador() para não mostrar valor menor que o real.
    const taxaPlano = Number(p.loja_taxa_por_pedido ?? 0) || 0;
    const tarifaClienteAPartirDoFrete = (freteEntregador: number) => {
      return Number((freteEntregador + taxaPlano).toFixed(2));
    };

    // FONTE DA VERDADE: o valor que o cliente já pagou/vai pagar está em
    // `taxa_entrega`. Se existir, usa direto — não recalcula por km, senão
    // o card do pool promete um valor maior do que o entregador vai receber
    // de fato ao finalizar a corrida.
    const taxaSalva = Number(p.taxa_entrega);
    if (Number.isFinite(taxaSalva) && taxaSalva > 0) {
      return Number(taxaSalva.toFixed(2));
    }

    const freteSnapshot = liquidoEntregador(
      p.taxa_entrega,
      taxaPlano,
      p.loja_plano_mensal_ativo,
    );
    const freteGlobalMinimo = calcularTarifaPorFaixa(0, tarifasGlobais ?? []);

    if (
      p.endereco_coleta_lat == null ||
      p.endereco_coleta_lng == null ||
      p.endereco_entrega_lat == null ||
      p.endereco_entrega_lng == null
    ) {
      return tarifaClienteAPartirDoFrete(freteGlobalMinimo ?? freteSnapshot);
    }
    const km = haversineKm(
      Number(p.endereco_coleta_lat),
      Number(p.endereco_coleta_lng),
      Number(p.endereco_entrega_lat),
      Number(p.endereco_entrega_lng),
    );
    const t = calcularTarifaPorFaixa(km, tarifasGlobais ?? []);
    return tarifaClienteAPartirDoFrete(t ?? freteGlobalMinimo ?? freteSnapshot);
  };
}


