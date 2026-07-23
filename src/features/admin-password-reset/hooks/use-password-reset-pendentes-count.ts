import { useEffect, useId } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subscribeLazy } from "@/lib/realtime-lazy";
import { useFranquia } from "@/hooks/use-franquia";

export function usePasswordResetPendentesCount() {
  const qc = useQueryClient();
  const uid = useId();
  const { isOwner, isFranqueado } = useFranquia();
  const enabled = isOwner || isFranqueado;

  const query = useQuery({
    queryKey: ["admin-password-reset-pendentes-count"],
    enabled,
    queryFn: async (): Promise<number> => {
      const { count, error } = await (supabase as any)
        .from("password_reset_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendente");
      if (error) {
        console.warn("[usePasswordResetPendentesCount]", error.message ?? error);
        return 0;
      }
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!enabled) return;
    const channelName = `admin-password-reset-rt-${uid}-${Math.random().toString(36).slice(2, 8)}`;
    return subscribeLazy(() =>
      supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "password_reset_requests" },
          () => {
            qc.invalidateQueries({ queryKey: ["admin-password-reset-pendentes-count"] });
            qc.invalidateQueries({ queryKey: ["admin-password-reset"] });
          },
        )
        .subscribe() as never,
    );
  }, [qc, uid, enabled]);

  return query;
}
