import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeLazy } from "@/lib/realtime-lazy";
import { toast } from "sonner";
import { mapMeuTurno } from "../logic/helpers";
import type { MeuTurno, MeuTurnoRow, TurnoDisponivel } from "../logic/types";

export function useTurnosEntregador(userId: string | undefined) {
  const [disponiveis, setDisponiveis] = useState<TurnoDisponivel[]>([]);
  const [meus, setMeus] = useState<MeuTurno[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [{ data: dispData, error: dispErr }, { data: meusData, error: meusErr }] =
      await Promise.all([
        (
          supabase.rpc as unknown as (
            fn: string,
          ) => Promise<{
            data: TurnoDisponivel[] | null;
            error: { message: string } | null;
          }>
        )("listar_turnos_disponiveis_entregador"),
        (
          supabase.rpc as unknown as (
            fn: string,
          ) => Promise<{
            data: MeuTurnoRow[] | null;
            error: { message: string } | null;
          }>
        )("listar_meus_turnos_entregador"),
      ]);
    if (dispErr) toast.error(dispErr.message);
    else setDisponiveis(dispData ?? []);
    if (meusErr) toast.error(meusErr.message);
    else setMeus((meusData ?? []).map(mapMeuTurno));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Fallback de polling: se o WebSocket cair (TWA/Android em background),
  // os turnos continuam sincronizando com o painel da loja.
  useEffect(() => {
    if (!userId) return;
    const id = setInterval(() => carregar(), 20_000);
    return () => clearInterval(id);
  }, [userId, carregar]);

  useEffect(() => {
    if (!userId) return;
    return subscribeLazy(
      () =>
        supabase
          .channel(`turnos-entregador-${userId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "agendamento_ofertas",
              filter: `entregador_id=eq.${userId}`,
            },
            (payload) => {
              carregar();
              if (payload.eventType === "INSERT") {
                toast.success("🔔 Nova oportunidade de turno disponível!", { duration: 6000 });
              }
            },
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "agendamentos" },
            () => carregar(),
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "agendamento_aceites" },
            () => carregar(),
          )
          .subscribe(),
      () => carregar(),
    );
  }, [userId, carregar]);


  return { disponiveis, meus, loading, carregar };
}
