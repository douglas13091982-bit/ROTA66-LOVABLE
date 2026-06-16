import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PedidoAtivo } from "../logic/types";

function mapPedido(p: any): PedidoAtivo {
  return {
    ...p,
    loja_plano_mensal_ativo: !!p.lojas?.plano_mensal_ativo,
  };
}

export function usePedidosAtivos(userId: string | undefined) {
  return useQuery({
    queryKey: ["pedidos-ativos", userId],
    enabled: !!userId,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*, lojas:loja_id(plano_mensal_ativo)")
        .eq("entregador_id", userId!)
        .in("status", ["em_rota", "coletado"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapPedido);
    },
  });
}

export function usePedidosLoteFinalizado(userId: string | undefined, loteIds: string[]) {
  return useQuery({
    queryKey: ["pedidos-lote-finalizado", userId, loteIds.join(",")],
    enabled: !!userId && loteIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*, lojas:loja_id(plano_mensal_ativo)")
        .eq("entregador_id", userId!)
        .eq("status", "entregue")
        .in("id", loteIds)
        .order("entrega_confirmada_em", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapPedido);
    },
  });
}
