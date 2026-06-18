import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LojaPublica } from "../logic/types";

export function useLojasCidade(cidade: string, uf?: string) {
  return useQuery({
    queryKey: ["clientes-lojas", cidade, uf ?? null],
    queryFn: async () => {
      let q = (supabase as any)
        .from("lojas_publicas")
        .select("id, nome, slug, telefone, endereco, cidade, estado, logo_url, taxa_entrega_base, categoria")
        .eq("ativa", true)
        .eq("catalogo_ativo", true)
        .ilike("cidade", cidade.trim());
      if (uf) q = q.or(`estado.is.null,estado.ilike.${uf.trim()}`);
      const { data, error } = await q.order("nome");
      if (error) throw error;
      return (data ?? []) as LojaPublica[];
    },
  });
}
