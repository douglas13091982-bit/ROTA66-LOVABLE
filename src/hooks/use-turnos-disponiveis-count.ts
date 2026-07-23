/**
 * Conta as oportunidades de turno disponíveis para o entregador logado.
 * Usa o RPC `listar_turnos_disponiveis_entregador` (mesmo da tela de Turnos)
 * com polling e realtime nas ofertas para manter o badge atualizado em
 * qualquer tela do painel do entregador.
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subscribeLazy } from "@/lib/realtime-lazy";
import { useAuth } from "@/hooks/use-auth";

const REFETCH_MS = 30_000;

export function useTurnosDisponiveisCount(): number {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const { data } = useQuery({
    queryKey: ["turnos-disponiveis-count", userId],
    enabled: !!userId,
    refetchInterval: REFETCH_MS,
    queryFn: async () => {
      const { data, error } = await (
        supabase.rpc as unknown as (
          fn: string,
        ) => Promise<{ data: unknown[] | null; error: { message: string } | null }>
      )("listar_turnos_disponiveis_entregador");
      if (error) return 0;
      return (data ?? []).length;
    },
  });

  useEffect(() => {
    if (!userId) return;
    return subscribeLazy(() =>
      supabase
        .channel(`turnos-count-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "agendamento_ofertas",
            filter: `entregador_id=eq.${userId}`,
          },
          () => {
            qc.invalidateQueries({ queryKey: ["turnos-disponiveis-count", userId] });
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "agendamentos" },
          () => {
            qc.invalidateQueries({ queryKey: ["turnos-disponiveis-count", userId] });
          },
        )
        .subscribe() as never,
    );
  }, [userId, qc]);

  return data ?? 0;
}
