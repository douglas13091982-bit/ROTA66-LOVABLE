import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PedidoRow } from "../logic/types";

export function useAdminPedidos() {
  return useQuery({
    queryKey: ["admin-pedidos"],
    queryFn: async (): Promise<PedidoRow[]> => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*, lojas!inner(nome, slug, is_teste)")
        .eq("lojas.is_teste", false)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as PedidoRow[];
    },
  });
}
