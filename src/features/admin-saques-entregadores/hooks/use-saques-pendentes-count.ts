import { useEffect, useId } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFranquia } from "@/hooks/use-franquia";

export function useSaquesPendentesCount() {
  const qc = useQueryClient();
  const uid = useId();
  const { isOwner } = useFranquia();
  const enabled = isOwner;

  const query = useQuery({
    queryKey: ["admin-saques-entregadores-pendentes-count"],
    enabled,
    queryFn: async (): Promise<number> => {
      const { count, error } = await (supabase as any)
        .from("entregador_saques")
        .select("*", { count: "exact", head: true })
        .in("status", ["solicitado", "pendente"]);
      if (error) {
        // RLS/permissão indisponível: não derruba o painel.
        console.warn("[useSaquesPendentesCount]", error.message ?? error);
        return 0;
      }
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!enabled) return;
    const channelName = `admin-entregador-saques-rt-${uid}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "entregador_saques" },
        () => {
          qc.invalidateQueries({ queryKey: ["admin-saques-entregadores-pendentes-count"] });
          qc.invalidateQueries({ queryKey: ["admin-saques-entregadores"] });
          qc.invalidateQueries({ queryKey: ["admin-saques-entregadores-recentes"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, uid, enabled]);

  return query;
}
