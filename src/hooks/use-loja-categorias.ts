import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type LojaCategoriaRow = {
  id: string;
  value: string;
  label: string;
  ordem: number;
  ativo: boolean;
  icone: string | null;
  icone_url: string | null;
};

const KEY = ["loja-categorias"] as const;

export function useLojaCategorias(opts?: { incluirInativas?: boolean }) {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: [...KEY, opts?.incluirInativas ?? false] as const,
    queryFn: async () => {
      let query = (supabase as any)
        .from("loja_categorias")
        .select("*")
        .order("ordem", { ascending: true })
        .order("label", { ascending: true });
      if (!opts?.incluirInativas) query = query.eq("ativo", true);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as LojaCategoriaRow[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  async function create(input: { value: string; label: string; ordem?: number; icone?: string | null; icone_url?: string | null }) {
    const value = input.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (!value || !input.label.trim()) {
      toast.error("Informe identificador e nome");
      return false;
    }
    const { error } = await (supabase as any).from("loja_categorias").insert({
      value,
      label: input.label.trim(),
      ordem: input.ordem ?? 0,
      icone: input.icone ?? null,
      icone_url: input.icone_url ?? null,
    });
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Categoria criada");
    invalidate();
    return true;
  }

  async function update(id: string, patch: Partial<Pick<LojaCategoriaRow, "label" | "ordem" | "ativo" | "icone" | "icone_url">>) {
    const { error } = await (supabase as any)
      .from("loja_categorias")
      .update(patch)
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Categoria atualizada");
    invalidate();
    return true;
  }

  async function remove(id: string, label: string) {
    if (!confirm(`Excluir a categoria "${label}"? Lojas vinculadas perdem a categoria.`)) return false;
    const { error } = await (supabase as any).from("loja_categorias").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Categoria excluída");
    invalidate();
    return true;
  }

  return {
    categorias: q.data ?? [],
    isLoading: q.isLoading,
    create,
    update,
    remove,
    invalidate,
  };
}

export function labelCategoriaDinamico(
  value: string | null | undefined,
  categorias: LojaCategoriaRow[],
): string {
  if (!value) return "—";
  return categorias.find((c) => c.value === value)?.label ?? value;
}
