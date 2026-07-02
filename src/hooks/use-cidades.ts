import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type CidadeRow = {
  id: string;
  nome: string;
  uf: string;
  slug: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

const KEY = ["cidades"] as const;

export function useCidades(opts?: { incluirInativas?: boolean }) {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: [...KEY, opts?.incluirInativas ?? false] as const,
    queryFn: async () => {
      let query = (supabase as any)
        .from("cidades")
        .select("*")
        .order("uf", { ascending: true })
        .order("nome", { ascending: true });
      if (!opts?.incluirInativas) query = query.eq("ativo", true);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as CidadeRow[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  async function create(input: { nome: string; uf: string }) {
    const nome = input.nome.trim();
    const uf = input.uf.trim().toUpperCase();
    if (!nome || uf.length !== 2) {
      toast.error("Informe nome e UF (2 letras)");
      return false;
    }
    const slug = slugify(nome, uf);
    const { error } = await (supabase as any)
      .from("cidades")
      .insert({ nome, uf, slug, ativo: true });
    if (error) {
      if ((error as any).code === "23505") {
        toast.error("Cidade já cadastrada");
      } else {
        toast.error(error.message || "Erro ao criar cidade");
      }
      return false;
    }
    toast.success("Cidade adicionada");
    invalidate();
    return true;
  }

  async function update(
    id: string,
    patch: Partial<Pick<CidadeRow, "nome" | "uf" | "ativo">>,
  ) {
    const next: Record<string, any> = { ...patch };
    if (patch.uf) next.uf = patch.uf.trim().toUpperCase();
    if (patch.nome) next.nome = patch.nome.trim();
    if (patch.nome || patch.uf) {
      // Recompute slug from combined final values
      const current = q.data?.find((c) => c.id === id);
      const nomeFinal = (patch.nome ?? current?.nome ?? "").trim();
      const ufFinal = (patch.uf ?? current?.uf ?? "").trim().toUpperCase();
      if (nomeFinal && ufFinal.length === 2) {
        next.slug = slugify(nomeFinal, ufFinal);
      }
    }
    const { error } = await (supabase as any)
      .from("cidades")
      .update(next)
      .eq("id", id);
    if (error) {
      if ((error as any).code === "23505") {
        toast.error("Já existe uma cidade com esse nome/UF");
      } else {
        toast.error(error.message || "Erro ao atualizar");
      }
      return false;
    }
    toast.success("Atualizado");
    invalidate();
    return true;
  }

  async function remove(id: string, nome: string) {
    if (!confirm(`Excluir a cidade "${nome}"? Se houver lojas ou perfis vinculados, a exclusão será bloqueada — nesse caso, prefira desativar.`)) {
      return false;
    }
    const { error } = await (supabase as any).from("cidades").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível excluir. Considere desativar a cidade.");
      return false;
    }
    toast.success("Cidade excluída");
    invalidate();
    return true;
  }

  return {
    cidades: q.data ?? [],
    isLoading: q.isLoading,
    create,
    update,
    remove,
  };
}

function slugify(nome: string, uf: string) {
  const raw = `${nome}-${uf}`;
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
