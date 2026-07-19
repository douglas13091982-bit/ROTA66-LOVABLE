import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { notificarTurnoPublicado } from "@/lib/push.functions";


export function useTurnoActions(turnoId: string, onChange: () => void) {
  const [busy, setBusy] = useState(false);

  async function rpc(fn: string) {
    setBusy(true);
    const { error } = await (
      supabase.rpc as unknown as (
        f: string,
        a: { _agendamento_id: string },
      ) => Promise<{ error: { message: string } | null }>
    )(fn, { _agendamento_id: turnoId });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return false;
    }
    return true;
  }

  async function publicar() {
    if (await rpc("publicar_turno")) {
      toast.success("Turno publicado! Os entregadores externos foram notificados.");
      // Dispara push "Nova Oportunidade Garantida" para todos os entregadores
      // aprovados da cidade da loja (sem bloquear o fluxo em caso de falha).
      notificarTurnoPublicado({ data: { agendamento_id: turnoId } }).catch((e) => {
        console.error("[publicar_turno] falha ao enviar push", e);
      });
      onChange();
    }
  }


  async function cancelar() {
    if (!confirm("Cancelar este turno?")) return;
    if (await rpc("cancelar_turno")) {
      toast.success("Turno cancelado");
      onChange();
    }
  }

  async function concluir() {
    if (!confirm("Marcar este turno como concluído?")) return;
    if (await rpc("concluir_turno")) {
      toast.success("Turno concluído");
      onChange();
    }
  }

  async function excluir() {
    if (!confirm("Excluir este turno permanentemente?")) return;
    setBusy(true);
    const { error } = await supabase.from("agendamentos" as never).delete().eq("id", turnoId);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Turno excluído");
    onChange();
  }

  return { busy, publicar, cancelar, concluir, excluir };
}
