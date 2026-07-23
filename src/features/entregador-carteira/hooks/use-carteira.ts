import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subscribeLazy } from "@/lib/realtime-lazy";
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

  // Realtime: atualiza saldo e histórico quando um pedido é entregue / saque processado
  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | null = null;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid || cancelled) return;
      const invalidarSaldo = () => {
        qc.invalidateQueries({ queryKey: ["entregador-saldo"] });
        qc.invalidateQueries({ queryKey: ["entregador-transacoes"] });
        qc.invalidateQueries({ queryKey: ["ganho-hoje", uid] });
      };
      stop = subscribeLazy(
        () =>
          supabase
            .channel(`entregador-saldo-${uid}`)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "entregador_creditos", filter: `entregador_id=eq.${uid}` },
              invalidarSaldo,
            )
            .on(
              "postgres_changes",
              { event: "INSERT", schema: "public", table: "entregador_creditos_transacoes", filter: `entregador_id=eq.${uid}` },
              invalidarSaldo,
            )
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "entregadores_saldo_saque", filter: `entregador_id=eq.${uid}` },
              invalidarSaldo,
            )
            .on(
              "postgres_changes",
              { event: "INSERT", schema: "public", table: "entregadores_saldo_saque_movimentos", filter: `entregador_id=eq.${uid}` },
              invalidarSaldo,
            )
            .subscribe() as never,
        invalidarSaldo,
      );

    })();
    return () => {
      cancelled = true;
      if (stop) stop();
    };
  }, [qc]);

  return { saldoQ, cfgQ, txQ };
}
