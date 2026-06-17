/**
 * Hook que encapsula TODAS as queries e realtime do entregador na tela de
 * pedidos disponíveis. Responsabilidades:
 *   - Buscar lojas vinculadas, pedidos vinculados, pool externo
 *   - Detectar rota ativa (bloqueia novos pedidos)
 *   - Carregar perfil externo, ganho do dia, tarifas globais
 *   - Mesclar e agrupar pedidos
 *   - Subscrever realtime
 */

import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { haversineKm } from "@/lib/geo";
import {
  agruparPedidosPorRota,
  mesclarPedidosDisponiveis,
} from "@/lib/pedido-agrupador";
import { calcularTarifaPorFaixa } from "@/lib/tarifa-calculator";
import type { PedidoDisponivel, TarifaFaixa } from "@/types/pedido";

const POOL_REFETCH_MS = 5_000;
const ROTA_ATIVA_REFETCH_MS = 15_000;
const GANHO_REFETCH_MS = 30_000;

export type UsePedidosDisponiveisResult = {
  grupos: ReturnType<typeof agruparPedidosPorRota>;
  isLoading: boolean;
  temRotaAtiva: boolean;
  semVinculoNemExterno: boolean;
  ganhoHoje: number;
  taxaParaExibir: (p: PedidoDisponivel) => number;
};

export function usePedidosDisponiveis(
  dismissed: string[],
): UsePedidosDisponiveisResult {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const { data: profileFlag } = useQuery({
    queryKey: ["meu-perfil-externo", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("aceita_pedidos_externos")
        .eq("id", userId!)
        .maybeSingle();
      return !!(data as { aceita_pedidos_externos?: boolean } | null)
        ?.aceita_pedidos_externos;
    },
  });

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



  const { data: rotaAtivaCount } = useQuery({
    queryKey: ["entregador-rota-ativa", userId],
    enabled: !!userId,
    refetchInterval: ROTA_ATIVA_REFETCH_MS,
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
  // Vinculados deixa de ser consultado separadamente.
  const pedidosVinculados: PedidoDisponivel[] = [];
  const loadingVinc = false;

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
    queryKey: ["tarifas-globais-moto"],
    enabled: !!profileFlag,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tarifas_globais")
        .select("*")
        .eq("ativa", true)
        .eq("tipo_veiculo", "moto");
      if (error) throw error;
      return (data ?? []) as unknown as TarifaFaixa[];
    },
  });

  // Realtime — ofertas externas para mim
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
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
          qc.invalidateQueries({ queryKey: ["pedidos-pool-externo", userId] });
          if (payload.eventType === "INSERT") {
            toast.success("🚨 Nova oferta de pedido disponível!");
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, qc]);

  // Realtime — qualquer pedido novo invalida o pool unificado
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`entregador-pedidos-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["pedidos-pool-externo", userId] });
          const novo = payload.new as { status?: string; entregador_id?: string | null } | null;
          const ficouPronto =
            (payload.eventType === "INSERT" || payload.eventType === "UPDATE") &&
            novo?.status === "pronto" &&
            !novo?.entregador_id;
          if (ficouPronto) {
            toast.success("🚨 Novo pedido pronto para retirar!");
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  const pedidos = useMemo(
    () => mesclarPedidosDisponiveis(pedidosVinculados, pedidosExternos),
    [pedidosVinculados, pedidosExternos],
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
    isLoading: loadingVinc || loadingExt,
    temRotaAtiva,
    semVinculoNemExterno: (!lojaIds || lojaIds.length === 0) && !profileFlag,
    ganhoHoje: ganhoHoje ?? 0,
    taxaParaExibir,
  };
}

function criarCalculadorTaxaExibida(
  tarifasGlobais: TarifaFaixa[] | undefined,
) {
  return (p: PedidoDisponivel): number => {
    const ehCartao = (p.forma_pagamento ?? "").toLowerCase() === "cartao";
    const dobrarSeExterno = (v: number) => (ehCartao && p._externo ? v * 2 : v);
    if (!p._externo) return Number(p.taxa_entrega) || 0;

    if (
      p.endereco_coleta_lat == null ||
      p.endereco_coleta_lng == null ||
      p.endereco_entrega_lat == null ||
      p.endereco_entrega_lng == null
    ) {
      return dobrarSeExterno(Number(p.taxa_entrega) || 0);
    }
    const km = haversineKm(
      Number(p.endereco_coleta_lat),
      Number(p.endereco_coleta_lng),
      Number(p.endereco_entrega_lat),
      Number(p.endereco_entrega_lng),
    );
    const t = calcularTarifaPorFaixa(km, tarifasGlobais ?? []);
    return dobrarSeExterno(t != null ? t : Number(p.taxa_entrega) || 0);
  };
}

