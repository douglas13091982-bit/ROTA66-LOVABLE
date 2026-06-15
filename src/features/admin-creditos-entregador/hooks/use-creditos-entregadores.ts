import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { EntregadorCreditoRow } from "../logic/types";

export function useCreditosEntregadores(enabled: boolean) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["admin-creditos-entregadores"],
    queryFn: async (): Promise<EntregadorCreditoRow[]> => {
      const { data, error } = await supabase.rpc("super_admin_listar_creditos" as any);
      if (error) throw error;
      return (data ?? []) as EntregadorCreditoRow[];
    },
    enabled,
  });

  const ajustar = async (entregador_id: string, nome: string) => {
    const txt = prompt(`Ajuste manual de saldo para "${nome}" (R$, use - para débito):`, "0");
    if (txt === null) return;
    const v = Number(String(txt).replace(",", "."));
    if (!Number.isFinite(v) || v === 0) {
      toast.error("Valor inválido");
      return;
    }
    const motivo = prompt("Motivo do ajuste:", "");
    if (!motivo) return;
    const { error } = await supabase.rpc("super_admin_ajustar_saldo" as any, {
      _entregador_id: entregador_id,
      _delta: v,
      _descricao: motivo,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saldo ajustado");
    qc.invalidateQueries({ queryKey: ["admin-creditos-entregadores"] });
    qc.invalidateQueries({ queryKey: ["admin-creditos-transacoes"] });
  };

  return { ...query, ajustar };
}
