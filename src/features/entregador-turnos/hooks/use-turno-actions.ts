import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useTurnoActions(onReload: () => Promise<void> | void) {
  const [cancelando, setCancelando] = useState(false);

  async function aceitar(id: string) {
    const { error } = await (
      supabase.rpc as unknown as (
        f: string,
        a: { _agendamento_id: string },
      ) => Promise<{ error: { message: string } | null }>
    )("aceitar_turno", { _agendamento_id: id });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Turno aceito! Apareceu em 'Meus turnos'.");
    await onReload();
  }

  async function desmarcar(id: string) {
    setCancelando(true);
    const { error } = await (
      supabase.rpc as unknown as (
        f: string,
        a: { _agendamento_id: string },
      ) => Promise<{ error: { message: string } | null }>
    )("desmarcar_turno_entregador", { _agendamento_id: id });
    setCancelando(false);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Turno desmarcado");
    await onReload();
    return true;
  }

  return { aceitar, desmarcar, cancelando };
}
