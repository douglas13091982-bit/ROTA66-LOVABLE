import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { AdminStats } from "../logic/types";

export function useAdminStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["admin-stats", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<AdminStats> => {
      const [lojas, entregadores, pedidos, gmv, franqueados] = await Promise.all([
        supabase.from("lojas").select("*", { count: "exact", head: true }),
        supabase
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("role", "entregador"),
        supabase.from("pedidos").select("*", { count: "exact", head: true }),
        supabase.from("pedidos").select("valor_total").eq("status", "entregue"),
        supabase.from("franqueados_config").select("*", { count: "exact", head: true }),
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
        franqueados: franqueados.count ?? 0,
      };
    },
  });
}
