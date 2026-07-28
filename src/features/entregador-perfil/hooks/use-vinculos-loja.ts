import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Ações do entregador sobre seus vínculos com lojas:
 * aceitar, recusar ou excluir o vínculo.
 */
export function useVinculosLoja(userId: string | undefined) {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["minhas-lojas-vinculo", userId] });
    qc.invalidateQueries({ queryKey: ["minhas-lojas-vinculadas", userId] });
  };

  async function responder(id: string, status: "aceito" | "recusado") {
    const patch: Record<string, unknown> = { status };
    if (status === "aceito") patch.ativo = true;
    const { error } = await supabase.from("loja_entregadores").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "aceito" ? "Vínculo aceito" : "Vínculo recusado");
    invalidate();
  }

  async function excluir(id: string) {
    const { error } = await supabase.from("loja_entregadores").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Vínculo removido");
    invalidate();
  }

  return { responder, excluir };
}
