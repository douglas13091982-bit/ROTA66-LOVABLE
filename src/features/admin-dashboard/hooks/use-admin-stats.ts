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
      const [lojas, rolesEntregadores, lojasTeste, franqueados] = await Promise.all([
        supabase.from("lojas").select("*", { count: "exact", head: true }).eq("is_teste", false),
        supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "entregador"),
        supabase.from("lojas").select("id").eq("is_teste", true),
        supabase.from("franqueados_config").select("*", { count: "exact", head: true }),
      ]);
      const testeIds = (lojasTeste.data ?? []).map((l: any) => l.id);
      const pedidosQ = supabase.from("pedidos").select("*", { count: "exact", head: true });
      if (testeIds.length) pedidosQ.not("loja_id", "in", `(${testeIds.join(",")})`);
      const gmvQ = supabase.from("pedidos").select("valor_total").eq("status", "entregue");
      if (testeIds.length) gmvQ.not("loja_id", "in", `(${testeIds.join(",")})`);
      const [pedidos, gmv] = await Promise.all([pedidosQ, gmvQ]);
      const entregadorIds = (rolesEntregadores.data ?? []).map((r) => r.user_id);
      let entregadoresVisiveis = 0;
      if (entregadorIds.length > 0) {
        // Conta somente profiles liberados pelo RLS. Franqueado não conta entregadores
        // sem city_id ou de outra cidade, mesmo se o role ainda estiver visível em cache.
        const { data: profilesVisiveis } = await supabase
          .from("profiles")
          .select("id")
          .in("id", entregadorIds);
        entregadoresVisiveis = profilesVisiveis?.length ?? 0;
      }
      const total = (gmv.data ?? []).reduce(
        (s, p) => s + Number(p.valor_total),
        0,
      );
      return {
        lojas: lojas.count ?? 0,
        entregadores: entregadoresVisiveis,
        pedidos: pedidos.count ?? 0,
        gmv: total,
        franqueados: franqueados.count ?? 0,
      };
    },
  });
}
