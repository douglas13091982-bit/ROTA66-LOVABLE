import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * A loja não confirma mais a coleta (a conferência do código é apenas
 * visual). O próprio entregador marca "Coletado" e o pedido avança para
 * a etapa de entrega — quando há rota agrupada, todos avançam juntos.
 */
export function useConfirmarColeta() {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  async function confirmarColeta(pedidoId: string) {
    setLoading(true);
    const { error } = await (
      supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ error: { message: string } | null }>
    )("entregador_confirmar_coleta", { _pedido_id: pedidoId });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Coleta confirmada! Siga para a entrega. 🚀");
    qc.invalidateQueries({ queryKey: ["pedidos-ativos"] });
    return true;
  }

  return { confirmarColeta, loading };
}
