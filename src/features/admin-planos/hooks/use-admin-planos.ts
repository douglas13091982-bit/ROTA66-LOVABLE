import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { PlanoFormState, PlanoRow } from "../logic/types";

const QK = ["admin-planos"];

function parseForm(form: PlanoFormState) {
  return {
    nome: form.nome.trim(),
    descricao: form.descricao.trim() || null,
    mensalidade_valor: Number(form.mensalidade_valor) || 0,
    taxa_por_pedido: Number(form.taxa_por_pedido) || 0,
    dia_vencimento: Math.min(Math.max(Number(form.dia_vencimento) || 10, 1), 28),
    destaque: !!form.destaque,
    ordem: Number(form.ordem) || 0,
    ativo: !!form.ativo,
  };
}

export function useAdminPlanos() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QK,
    queryFn: async (): Promise<PlanoRow[]> => {
      const { data, error } = await (supabase as any)
        .from("planos_loja")
        .select("*")
        .order("ordem")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as PlanoRow[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: QK });

  async function clearOtherDestaques(currentId?: string) {
    const q = (supabase as any).from("planos_loja").update({ destaque: false }).eq("destaque", true);
    if (currentId) q.neq("id", currentId);
    await q;
  }

  const add = async (form: PlanoFormState) => {
    const payload = parseForm(form);
    if (!payload.nome) {
      toast.error("Nome do plano é obrigatório");
      return false;
    }
    if (payload.destaque) await clearOtherDestaques();
    const { error } = await (supabase as any).from("planos_loja").insert(payload);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Plano criado");
    invalidate();
    return true;
  };

  const update = async (id: string, form: PlanoFormState) => {
    const payload = parseForm(form);
    if (!payload.nome) {
      toast.error("Nome do plano é obrigatório");
      return false;
    }
    if (payload.destaque) await clearOtherDestaques(id);
    const { error } = await (supabase as any).from("planos_loja").update(payload).eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Plano atualizado");
    invalidate();
    return true;
  };

  const toggleAtivo = async (p: PlanoRow) => {
    const { error } = await (supabase as any)
      .from("planos_loja")
      .update({ ativo: !p.ativo })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    invalidate();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("planos_loja").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Plano removido");
    invalidate();
  };

  return { ...query, add, update, toggleAtivo, remove };
}
