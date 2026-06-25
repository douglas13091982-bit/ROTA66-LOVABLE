import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SystemAlert = {
  id: string;
  tipo: string;
  severidade: "warn" | "crit";
  mensagem: string;
  metric_value: number | null;
  threshold: number | null;
  metadata: any;
  resolvido: boolean;
  resolvido_em: string | null;
  created_at: string;
};

export type SystemAlertsConfig = {
  query_mean_ms_warn: number;
  query_mean_ms_crit: number;
  query_max_ms_crit: number;
  connections_warn: number;
  connections_crit: number;
  pedidos_pagamento_pendente_min: number;
};

export function useSystemAlerts(includeResolved = false) {
  return useQuery({
    queryKey: ["system-alerts", includeResolved],
    refetchInterval: 60_000,
    queryFn: async () => {
      let q = (supabase as any)
        .from("system_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (!includeResolved) q = q.eq("resolvido", false);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SystemAlert[];
    },
  });
}

export function useSystemAlertsCount() {
  return useQuery({
    queryKey: ["system-alerts-count"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("system_alerts")
        .select("id", { count: "exact", head: true })
        .eq("resolvido", false);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useSystemAlertsConfig() {
  return useQuery({
    queryKey: ["system-alerts-config"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("system_alerts_config")
        .select("*")
        .eq("singleton", true)
        .maybeSingle();
      if (error) throw error;
      return data as SystemAlertsConfig;
    },
  });
}

export function useResolverAlerta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("resolver_system_alert", { _alert_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["system-alerts"] });
      qc.invalidateQueries({ queryKey: ["system-alerts-count"] });
    },
  });
}

export function useUpdateAlertsConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cfg: Partial<SystemAlertsConfig>) => {
      const { error } = await (supabase as any)
        .from("system_alerts_config")
        .update({ ...cfg, updated_at: new Date().toISOString() })
        .eq("singleton", true);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["system-alerts-config"] }),
  });
}
