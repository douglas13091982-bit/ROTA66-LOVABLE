import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subscribeLazy } from "@/lib/realtime-lazy";
import { isEffectivelyOnline, useOnlineTtlTicker } from "@/lib/entregador-online";
import type { EntregadorItem } from "../logic/types";

export function useEntregadoresVinculados(lojaId: string) {
  const qc = useQueryClient();
  const { ttlMin, tick } = useOnlineTtlTicker(20_000);

  useEffect(() => {
    return subscribeLazy(() =>
      supabase
        .channel(`loja-entregador-status-${lojaId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "entregador_status" },
          () => qc.invalidateQueries({ queryKey: ["loja-entregadores-lista", lojaId] })
        )
        .subscribe()
    );
  }, [lojaId, qc]);

  const { data: raw, isLoading } = useQuery({
    queryKey: ["loja-entregadores-lista", lojaId],
    queryFn: async () => {
      const { data: vinc, error: vincError } = await supabase.rpc(
        "listar_entregadores_loja",
        { _loja_id: lojaId }
      );
      if (vincError) throw vincError;
      const ativos = (vinc ?? []).filter((v: any) => v.ativo);
      if (ativos.length === 0) return [] as EntregadorItem[];

      const ids = ativos.map((v: any) => v.entregador_id);

      const { data: statusList } = await supabase
        .from("entregador_status")
        .select("entregador_id, online, lat, lng, updated_at")
        .in("entregador_id", ids);

      const { data: pedidosAtivos } = await supabase
        .from("pedidos")
        .select("entregador_id")
        .eq("loja_id", lojaId)
        .not("entregador_id", "is", null)
        .not("status", "in", "(entregue,cancelado)");

      const emEntregaSet = new Set<string>(
        (pedidosAtivos ?? []).map((p: any) => p.entregador_id),
      );

      const mapStatus = new Map<string, any>();
      for (const s of statusList ?? []) mapStatus.set(s.entregador_id, s);

      return ativos.map((v: any): EntregadorItem => {
        const st = mapStatus.get(v.entregador_id);
        return {
          id: v.entregador_id,
          full_name: v.full_name,
          phone: v.phone,
          avatar_url: v.avatar_url ?? null,
          online: st?.online ?? false,
          em_entrega: emEntregaSet.has(v.entregador_id),
          lat: st?.lat ?? null,
          lng: st?.lng ?? null,
          updated_at: st?.updated_at ?? null,
        };
      });
    },
    refetchInterval: 30_000,
  });

  // Aplica TTL: entregadores sem heartbeat recente viram offline sozinhos.
  // Mas quem está em entrega ativa dessa loja permanece "online" na UI.
  void tick;
  const data = (raw ?? [])
    .map((e) => ({
      ...e,
      online: e.em_entrega || isEffectivelyOnline(e.online, e.updated_at, ttlMin),
    }))
    .sort((a, b) => Number(b.online) - Number(a.online));


  return { data, isLoading };
}
