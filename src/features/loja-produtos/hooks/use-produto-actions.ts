import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Produto } from "../logic/types";

export function useProdutoActions(p: Produto, onChanged: () => void) {
  async function toggleAtivo() {
    const { error } = await (supabase as any)
      .from("produtos")
      .update({ ativo: !p.ativo })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(!p.ativo ? "Produto ativado" : "Produto desativado");
    onChanged();
  }

  async function remove() {
    if (!confirm(`Excluir "${p.nome}"?`)) return;
    const { error } = await supabase.from("produtos" as any).delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Produto excluído");
    onChanged();
  }

  return { toggleAtivo, remove };
}
