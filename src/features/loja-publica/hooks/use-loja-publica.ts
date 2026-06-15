import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LojaPublica } from "../logic/types";

export function useLojaPublica(slug: string) {
  return useQuery({
    queryKey: ["loja-publica", slug],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lojas_publicas")
        .select("id, nome, slug, telefone, endereco, cidade, estado, logo_url, taxa_entrega_base, ativa")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as LojaPublica | null;
    },
  });
}
