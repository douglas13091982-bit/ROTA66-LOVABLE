import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function useVincularEntregador(lojaId: string | undefined, onDone: () => void) {
  const [termo, setTermo] = useState("");
  const [adding, setAdding] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!lojaId) return;
    const t = termo.trim();
    if (t.length < 3) {
      toast.error("Informe ao menos 3 caracteres");
      return;
    }
    setAdding(true);
    const { data: encontrados, error: rpcError } = await supabase.rpc("buscar_entregador", {
      termo: t,
    });
    if (rpcError) {
      toast.error(rpcError.message);
      setAdding(false);
      return;
    }
    if (!encontrados || encontrados.length === 0) {
      toast.error("Entregador não encontrado", {
        description:
          "Peça para o entregador se cadastrar primeiro e informar telefone ou nome.",
      });
      setAdding(false);
      return;
    }
    if (encontrados.length > 1) {
      toast.error("Mais de um entregador encontrado", {
        description: "Refine a busca usando o telefone completo.",
      });
      setAdding(false);
      return;
    }
    const profile = encontrados[0];
    const { error } = await supabase
      .from("loja_entregadores")
      .insert({ loja_id: lojaId, entregador_id: profile.id });
    setAdding(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${profile.full_name ?? "Entregador"} vinculado!`);
    setTermo("");
    onDone();
  }

  return { termo, setTermo, adding, submit };
}
