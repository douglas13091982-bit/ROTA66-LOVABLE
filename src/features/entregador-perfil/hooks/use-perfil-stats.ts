import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePerfilStats(userId: string | undefined) {
  return useQuery({
    queryKey: ["perfil-stats", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count } = await supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("entregador_id", userId!)
        .eq("status", "entregue");
      return { entregas: count ?? 0 };
    },
  });
}

export function useLojasVinculo(userId: string | undefined) {
  return useQuery({
    queryKey: ["minhas-lojas-vinculo", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: vinc } = await supabase
        .from("loja_entregadores")
        .select("loja_id, ativo")
        .eq("entregador_id", userId!);
      if (!vinc || vinc.length === 0) return [];
      const ids = vinc.map((v) => v.loja_id);
      const { data: lojas } = await supabase
        .from("lojas")
        .select("id, nome")
        .in("id", ids);
      return vinc.map((v) => ({
        ...v,
        loja: lojas?.find((l) => l.id === v.loja_id),
      }));
    },
  });
}
