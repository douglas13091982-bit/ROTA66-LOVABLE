import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { EntregadorAceito, TurnoRow } from "../logic/types";

export function useTurnosLoja(lojaId: string | undefined) {
  const [turnos, setTurnos] = useState<TurnoRow[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    if (!lojaId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("agendamentos" as never)
      .select("*")
      .eq("loja_id", lojaId)
      .order("data_turno", { ascending: false })
      .order("hora_inicio", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as unknown as TurnoRow[];
    rows.forEach((r) => {
      r.aceites = [];
    });
    if (rows.length > 0) {
      const { data: profs } = await (
        supabase.rpc as unknown as (
          f: string,
          a: { _loja_id: string },
        ) => Promise<{
          data:
            | {
                agendamento_id: string;
                entregador_id: string;
                full_name: string | null;
                avatar_url: string | null;
                aceito_em: string;
              }[]
            | null;
        }>
      )("get_entregadores_turnos_loja", { _loja_id: lojaId });
      const byTurno = new Map<string, EntregadorAceito[]>();
      (profs ?? []).forEach((p) => {
        const arr = byTurno.get(p.agendamento_id) ?? [];
        arr.push({ full_name: p.full_name, avatar_url: p.avatar_url, aceito_em: p.aceito_em });
        byTurno.set(p.agendamento_id, arr);
      });
      rows.forEach((r) => {
        r.aceites = byTurno.get(r.id) ?? [];
      });
    }
    setTurnos(rows);
    setLoading(false);
  }, [lojaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (!lojaId) return;
    const ch = supabase
      .channel(`turnos-loja-${lojaId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agendamentos", filter: `loja_id=eq.${lojaId}` },
        () => carregar(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [lojaId, carregar]);

  return { turnos, loading, carregar };
}
