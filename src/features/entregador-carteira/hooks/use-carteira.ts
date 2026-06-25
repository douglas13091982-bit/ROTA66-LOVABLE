import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ConfigCreditos, SaldoEntregador, TransacaoCredito } from "../logic/types";

export function useCarteira() {
  const qc = useQueryClient();

  const saldoQ = useQuery({
    queryKey: ["entregador-saldo"],
    queryFn: async (): Promise<SaldoEntregador> => {
      const { data, error } = await supabase.rpc("entregador_saldo_atual" as any);
      if (error) throw error;
      return ((data as any)?.[0] ?? null) as SaldoEntregador;
    },
  });

  const cfgQ = useQuery({
    queryKey: ["entregador-config-creditos"],
    queryFn: async (): Promise<ConfigCreditos> => {
      const { data, error } = await supabase.rpc("get_config_creditos_entregador" as any);
      if (error) throw error;
      return ((data as any)?.[0] ?? null) as ConfigCreditos;
    },
  });

  const txQ = useQuery({
    queryKey: ["entregador-transacoes"],
    queryFn: async (): Promise<TransacaoCredito[]> => {
      const { data, error } = await supabase
        .from("entregador_creditos_transacoes" as any)
        .select("id, tipo, valor, saldo_apos, descricao, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as TransacaoCredito[];
    },
  });

  return { saldoQ, cfgQ, txQ };
}
