import { useEffect, useId } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFranquia } from "@/hooks/use-franquia";
import { useAdminPermissoes } from "@/hooks/use-admin-permissoes";

export function useDocsEntregadorPendentesCount() {
  const qc = useQueryClient();
  const uid = useId();
  const { isOwner, isFranqueado, isColaborador } = useFranquia();
  const { can } = useAdminPermissoes();
  const enabled = isOwner || isFranqueado || isColaborador || can("entregadores");

  const query = useQuery({
    queryKey: ["admin-docs-entregador-pendentes-count"],
    enabled,
    queryFn: async (): Promise<number> => {
      const { count, error } = await (supabase as any)
        .from("entregador_documentos")
        .select("*", { count: "exact", head: true })
        .eq("status", "enviado");
      if (error) {
        console.warn("[useDocsEntregadorPendentesCount]", error.message ?? error);
        return 0;
      }
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!enabled) return;
    const channelName = `admin-docs-entregador-rt-${uid}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "entregador_documentos" },
        () => {
          qc.invalidateQueries({ queryKey: ["admin-docs-entregador-pendentes-count"] });
          qc.invalidateQueries({ queryKey: ["admin-entregadores"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, uid, enabled]);

  return query;
}
