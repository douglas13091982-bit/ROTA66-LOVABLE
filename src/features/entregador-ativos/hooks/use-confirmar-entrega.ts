import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function useConfirmarEntrega(pedidoId: string) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  async function confirmar(codigo: string) {
    if (codigo.length !== 4) return false;
    setLoading(true);
    const { error } = await supabase.rpc("confirmar_entrega", {
      _pedido_id: pedidoId,
      _codigo: codigo,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Entrega confirmada! 🎉");
    qc.invalidateQueries({ queryKey: ["pedidos-ativos"] });
    return true;
  }

  return { confirmar, loading };
}
