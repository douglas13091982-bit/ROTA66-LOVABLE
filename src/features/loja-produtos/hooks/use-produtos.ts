import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { withProdutoSignedSidecar } from "@/lib/produto-image";
import type { Produto } from "../logic/types";

export function useProdutos(lojaId: string | undefined) {
  return useQuery({
    queryKey: ["produtos", lojaId],
    enabled: !!lojaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos" as any)
        .select("*")
        .eq("loja_id", lojaId!)
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return await withProdutoSignedSidecar(data as unknown as Produto[]);
    },
  });
}
