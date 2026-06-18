import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PlanoRow } from "@/features/admin-planos/logic/types";

export function usePlanosDisponiveis() {
  return useQuery({
    queryKey: ["planos-disponiveis"],
    queryFn: async (): Promise<PlanoRow[]> => {
      const { data, error } = await (supabase as any)
        .from("planos_loja")
        .select("*")
        .eq("ativo", true)
        .order("ordem")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as PlanoRow[];
    },
  });
}
