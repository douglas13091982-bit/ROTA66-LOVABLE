import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

function soDigitos(s: string) {
  return s.replace(/\D/g, "");
}

export function useVincularEntregador(lojaId: string | undefined, onDone: () => void) {
  const [termo, setTermo] = useState("");
  const [adding, setAdding] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!lojaId) return;
    const digitos = soDigitos(termo);
    if (digitos.length < 10 || digitos.length > 13) {
      toast.error("Informe um telefone válido com DDD (ex.: 11912345678).");
      return;
    }
    setAdding(true);
    const { data: encontrados, error: rpcError } = await supabase.rpc("buscar_entregador", {
      termo: digitos,
    });
    if (rpcError) {
      toast.error(rpcError.message);
      setAdding(false);
      return;
    }
    if (!encontrados || encontrados.length === 0) {
      toast.error("Entregador não encontrado", {
        description:
          "Confirme o telefone com DDD. O entregador precisa estar cadastrado no app.",
      });
      setAdding(false);
      return;
    }
    if (encontrados.length > 1) {
      toast.error("Mais de um entregador com este telefone", {
        description: "Contate o suporte para resolver o cadastro duplicado.",
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
