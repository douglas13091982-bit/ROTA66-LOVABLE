import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AdminStats } from "../logic/types";

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async (): Promise<AdminStats> => {
      const [lojas, entregadores, pedidos, gmv] = await Promise.all([
        supabase.from("lojas").select("*", { count: "exact", head: true }),
        supabase
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("role", "entregador"),
        supabase.from("pedidos").select("*", { count: "exact", head: true }),
        supabase.from("pedidos").select("valor_total").eq("status", "entregue"),
      ]);
      const total = (gmv.data ?? []).reduce(
        (s, p) => s + Number(p.valor_total),
        0,
      );
      return {
        lojas: lojas.count ?? 0,
        entregadores: entregadores.count ?? 0,
        pedidos: pedidos.count ?? 0,
        gmv: total,
      };
    },
  });
}
