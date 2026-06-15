import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LojaStats } from "../logic/types";

export function useLojaStats(lojaId: string | undefined) {
  return useQuery({
    queryKey: ["loja-stats", lojaId],
    enabled: !!lojaId,
    queryFn: async (): Promise<LojaStats> => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: pedidos } = await supabase
        .from("pedidos")
        .select("status, valor_total, created_at, entregador_id")
        .eq("loja_id", lojaId!);
      const list = pedidos ?? [];
      const hoje = list.filter((p) => new Date(p.created_at) >= today);
      const ativos = list.filter((p) => !["entregue", "cancelado"].includes(p.status));
      const faturamentoHoje = hoje
        .filter((p) => p.status === "entregue")
        .reduce((sum, p) => sum + Number(p.valor_total), 0);
      const { count: entregadoresCount } = await supabase
        .from("loja_entregadores")
        .select("*", { count: "exact", head: true })
        .eq("loja_id", lojaId!)
        .eq("ativo", true);
      return {
        pedidosHoje: hoje.length,
        ativos: ativos.length,
        faturamentoHoje,
        entregadores: entregadoresCount ?? 0,
      };
    },
  });
}
