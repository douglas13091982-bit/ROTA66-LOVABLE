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
    // Fallback lento: o tempo real (broadcast) é o caminho principal.
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rastrear_pedido", { _pedido_id: pedidoId });
      if (error) throw error;
      if (!data || data.length === 0) throw notFound();
      return data[0] as RastreioData;
    },
  });

  useEffect(() => {
    const invalidate = () => qc.invalidateQueries({ queryKey: ["rastreio", pedidoId] });
    return subscribeLazy(
      () =>
        supabase
          // Canal público de broadcast: o trigger `trg_rastreio_broadcast`
          // envia um ping a cada mudança de etapa/chegada. O cliente do
          // rastreio não está autenticado, então `postgres_changes` (que
          // depende de RLS) nunca chegaria até ele.
          .channel(`rastreio:${pedidoId}`, { config: { private: false } })
          .on("broadcast", { event: "rastreio_update" }, invalidate)
          .subscribe(),
      invalidate,
    );
  }, [pedidoId, qc]);



  return query;
}
