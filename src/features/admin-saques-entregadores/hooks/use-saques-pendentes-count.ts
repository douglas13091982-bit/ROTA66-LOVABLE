import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSaquesPendentesCount() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["admin-saques-entregadores-pendentes-count"],
    queryFn: async (): Promise<number> => {
      const { count, error } = await (supabase as any)
        .from("entregador_saques")
        .select("*", { count: "exact", head: true })
        .in("status", ["solicitado", "pendente"]);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("admin-entregador-saques-realtime")
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
  }, [qc]);

  return query;
}
