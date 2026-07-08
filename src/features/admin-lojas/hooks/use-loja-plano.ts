import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Gerencia o estado de mensalidade e plano mensal de uma loja específica. */
export function useLojaPlano(loja: any, onChanged: () => void) {
  const [mensValor, setMensValor] = useState<string>(
    loja.mensalidade_valor != null ? String(loja.mensalidade_valor) : "",
  );
  const [diaVenc, setDiaVenc] = useState<string>(
    loja.dia_vencimento_mensalidade != null
      ? String(loja.dia_vencimento_mensalidade)
      : "",
  );
  const [savingM, setSavingM] = useState(false);
  const [planoAtivo, setPlanoAtivo] = useState<boolean>(!!loja.plano_mensal_ativo);
  const [savingPlano, setSavingPlano] = useState(false);

  async function salvarMensalidade() {
    setSavingM(true);
    const patch: any = {
      mensalidade_valor: mensValor === "" ? null : Number(mensValor),
      dia_vencimento_mensalidade:
        diaVenc === ""
          ? null
          : Math.min(Math.max(Number(diaVenc), 1), 28),
    };
    const { error } = await (supabase as any)
      .from("lojas")
      .update(patch)
      .eq("id", loja.id);
    setSavingM(false);
    if (error) return toast.error(error.message);
    toast.success("Mensalidade atualizada");
    onChanged();
  }

  async function togglePlano() {
    setSavingPlano(true);
    const novo = !planoAtivo;
    const { error } = await (supabase as any)
      .from("lojas")
      .update({ plano_mensal_ativo: novo })
      .eq("id", loja.id);
    setSavingPlano(false);
    if (error) return toast.error(error.message);
    setPlanoAtivo(novo);
    toast.success(
      novo
        ? "Plano mensal ativado"
        : "Plano mensal desativado",
    );
    onChanged();
  }

  return {
    mensValor,
    setMensValor,
    diaVenc,
    setDiaVenc,
    savingM,
    salvarMensalidade,
    planoAtivo,
    savingPlano,
    togglePlano,
  };
}
