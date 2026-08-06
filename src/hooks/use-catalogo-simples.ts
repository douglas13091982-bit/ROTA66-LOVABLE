import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCatalogoSimples(lojaId: string) {
  return useQuery({
    queryKey: ["catalogo-simples", lojaId],
    enabled: !!lojaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos" as any)
        .select("id, nome, preco")
        .eq("loja_id", lojaId)
        .eq("ativo", true)
        .order("nome", { ascending: true });

      if (error) throw error;
      return data as { id: string; nome: string; preco: number }[];
    },
    staleTime: 60000,
  });
}
