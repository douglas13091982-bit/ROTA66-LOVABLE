import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TransacaoRow } from "../logic/types";

export function useCreditosTransacoes(enabled: boolean) {
  const txQ = useQuery({
    queryKey: ["admin-creditos-transacoes"],
    queryFn: async (): Promise<TransacaoRow[]> => {
      const { data, error } = await supabase
        .from("entregador_creditos_transacoes" as any)
        .select("id, entregador_id, tipo, valor, saldo_apos, descricao, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as TransacaoRow[];
    },
    enabled,
  });

  const nomesQ = useQuery({
    queryKey: ["admin-creditos-nomes", txQ.data?.length],
    enabled: !!txQ.data?.length,
    queryFn: async () => {
      const ids = Array.from(new Set((txQ.data ?? []).map((t) => t.entregador_id)));
      const { data } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const map: Record<string, string> = {};
      (data ?? []).forEach((p: any) => (map[p.id] = p.full_name ?? p.id));
      return map;
    },
  });

  return { txQ, nomesQ };
}
