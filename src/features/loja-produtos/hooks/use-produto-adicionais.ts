import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type AdicionalOpcao = {
  id: string;
  grupo_id: string;
  nome: string;
  preco: number;
  ativo: boolean;
  ordem: number;
};

export type AdicionalGrupo = {
  id: string;
  produto_id: string;
  nome: string;
  obrigatorio: boolean;
  min_escolhas: number;
  max_escolhas: number;
  ordem: number;
  opcoes: AdicionalOpcao[];
};

export function useProdutoAdicionais(produtoId: string, open: boolean) {
  const [grupos, setGrupos] = useState<AdicionalGrupo[]>([]);
  const [loading, setLoading] = useState(false);

  async function reload() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("produto_adicional_grupos")
      .select("id, produto_id, nome, obrigatorio, min_escolhas, max_escolhas, ordem, opcoes:produto_adicional_opcoes(id, grupo_id, nome, preco, ativo, ordem)")
      .eq("produto_id", produtoId)
      .order("ordem", { ascending: true });
    setLoading(false);
    if (error) return toast.error(error.message);
    const rows = ((data ?? []) as any[]).map((g) => ({
      ...g,
      opcoes: (g.opcoes ?? []).sort((a: any, b: any) => (a.ordem ?? 0) - (b.ordem ?? 0)),
    })) as AdicionalGrupo[];
    setGrupos(rows);
  }

  useEffect(() => {
    if (open && produtoId) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, produtoId]);

  async function addGrupo() {
    const { error } = await (supabase as any)
      .from("produto_adicional_grupos")
      .insert({ produto_id: produtoId, nome: "Novo grupo", ordem: grupos.length });
    if (error) return toast.error(error.message);
    reload();
  }

  async function updateGrupo(id: string, patch: Partial<AdicionalGrupo>) {
    const { error } = await (supabase as any)
      .from("produto_adicional_grupos")
      .update(patch)
      .eq("id", id);
    if (error) return toast.error(error.message);
    reload();
  }

  async function removeGrupo(id: string) {
    if (!confirm("Remover este grupo e todas as opções?")) return;
    const { error } = await (supabase as any)
      .from("produto_adicional_grupos")
      .delete()
      .eq("id", id);
    if (error) return toast.error(error.message);
    reload();
  }

  async function addOpcao(grupoId: string, ordem: number) {
    const { error } = await (supabase as any)
      .from("produto_adicional_opcoes")
      .insert({ grupo_id: grupoId, nome: "Nova opção", preco: 0, ordem });
    if (error) return toast.error(error.message);
    reload();
  }

  async function updateOpcao(id: string, patch: Partial<AdicionalOpcao>) {
    const { error } = await (supabase as any)
      .from("produto_adicional_opcoes")
      .update(patch)
      .eq("id", id);
    if (error) return toast.error(error.message);
    reload();
  }

  async function removeOpcao(id: string) {
    const { error } = await (supabase as any)
      .from("produto_adicional_opcoes")
      .delete()
      .eq("id", id);
    if (error) return toast.error(error.message);
    reload();
  }

  return {
    grupos,
    loading,
    reload,
    addGrupo,
    updateGrupo,
    removeGrupo,
    addOpcao,
    updateOpcao,
    removeOpcao,
  };
}
