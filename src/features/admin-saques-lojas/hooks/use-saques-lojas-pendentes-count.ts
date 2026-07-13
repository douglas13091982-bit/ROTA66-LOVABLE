import { useEffect, useId } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function useSaquesLojasPendentesCount() {
  const qc = useQueryClient();
  const uid = useId();
  const { roles } = useAuth();
  const enabled = roles.includes("super_admin") || roles.includes("admin");

  const query = useQuery({
    queryKey: ["admin-saques-lojas-pendentes-count"],
    enabled,
    queryFn: async (): Promise<number> => {
      const { count, error } = await (supabase as any)
        .from("lojas_saques")
        .select("*", { count: "exact", head: true })
        .in("status", ["solicitado", "pendente"]);
      if (error) {
        console.warn("[useSaquesLojasPendentesCount]", error.message ?? error);
        return 0;
      }
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!enabled) return;
    const channelName = `admin-lojas-saques-rt-${uid}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lojas_saques" },
        () => {
          qc.invalidateQueries({ queryKey: ["admin-saques-lojas-pendentes-count"] });
          qc.invalidateQueries({ queryKey: ["admin-saques-lojas"] });
          qc.invalidateQueries({ queryKey: ["admin-saques-lojas-recentes"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, uid, enabled]);

  return query;
}
