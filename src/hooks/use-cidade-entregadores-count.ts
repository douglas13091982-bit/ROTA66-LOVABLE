import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TTL_MS = 5 * 60_000;

export function useCidadeEntregadoresCount(cityId?: string | null) {
  return useQuery({
    queryKey: ["cidade-entregadores-count", cityId],
    enabled: !!cityId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entregador_status")
        .select("online, updated_at, profiles!inner(city_id)")
        .eq("profiles.city_id", cityId!);
      if (error) throw error;
      const now = Date.now();
      let online = 0;
      let offline = 0;
      (data ?? []).forEach((r: any) => {
        const fresh =
          r.online && now - new Date(r.updated_at).getTime() < TTL_MS;
        if (fresh) online++;
        else offline++;
      });
      return { online, offline, total: online + offline };
    },
  });
}
