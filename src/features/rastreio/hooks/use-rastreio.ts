import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { subscribeLazy } from "@/lib/realtime-lazy";
import type { RastreioData } from "../logic/types";

export function useRastreio(pedidoId: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["rastreio", pedidoId],
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rastrear_pedido", { _pedido_id: pedidoId });
      if (error) throw error;
      if (!data || data.length === 0) throw notFound();
      return data[0] as RastreioData;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`rastreio-${pedidoId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pedidos", filter: `id=eq.${pedidoId}` },
        () => qc.invalidateQueries({ queryKey: ["rastreio", pedidoId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [pedidoId, qc]);

  return query;
}
