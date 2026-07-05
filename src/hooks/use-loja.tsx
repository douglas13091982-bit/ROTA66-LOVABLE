import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function useMinhaLoja() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["minha-loja", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lojas")
        // Também trazemos o plano vinculado para que a UI use a taxa/mensalidade
        // do plano como fonte de verdade — as colunas legadas em `lojas`
        // podem estar desatualizadas depois de uma troca de plano.
        .select("*, plano:planos_loja!lojas_plano_id_fkey(id, nome, mensalidade_valor, taxa_por_pedido)")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
