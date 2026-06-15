import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isEffectivelyOnline, useOnlineTtlTicker } from "@/lib/entregador-online";
import type { AdminEntregadorItem } from "../logic/types";

export function useEntregadoresLista() {
  const qc = useQueryClient();
  const { ttlMin, tick } = useOnlineTtlTicker(20_000);

  useEffect(() => {
    const ch = supabase
      .channel("admin-entregador-status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "entregador_status" },
        () => qc.invalidateQueries({ queryKey: ["admin-entregadores-lista"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const { data: raw, isLoading } = useQuery({
    queryKey: ["admin-entregadores-lista"],
    queryFn: async (): Promise<AdminEntregadorItem[]> => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "entregador");

      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];

      const [{ data: profiles }, { data: statusList }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, phone").in("id", ids),
        supabase
          .from("entregador_status")
          .select("entregador_id, online, lat, lng, updated_at")
          .in("entregador_id", ids),
      ]);

      const mapProfile = new Map<string, any>();
      for (const p of profiles ?? []) mapProfile.set(p.id, p);
      const mapStatus = new Map<string, any>();
      for (const s of statusList ?? []) mapStatus.set(s.entregador_id, s);

      return ids.map((id) => {
        const p = mapProfile.get(id);
        const st = mapStatus.get(id);
        return {
          id,
          full_name: p?.full_name ?? null,
          phone: p?.phone ?? null,
          online: st?.online ?? false,
          lat: st?.lat ?? null,
          lng: st?.lng ?? null,
          updated_at: st?.updated_at ?? null,
        };
      });
    },
    refetchInterval: 30_000,
  });

  const data = useMemo(() => {
    void tick;
    const list = (raw ?? []).map((e) => ({
      ...e,
      online: isEffectivelyOnline(e.online, e.updated_at, ttlMin),
    }));
    list.sort((a, b) => Number(b.online) - Number(a.online));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, tick, ttlMin]);

  const onlineCount = data.filter((e) => e.online).length;

  return { data, isLoading, onlineCount, total: data.length };
}
