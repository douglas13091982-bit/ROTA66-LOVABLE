import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const LOJAS_KEY = ["admin-lojas"] as const;

export function useLojas() {
  const qc = useQueryClient();

  const { data: lojas, isLoading } = useQuery({
    queryKey: LOJAS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lojas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: LOJAS_KEY });

  const setStatus = async (id: string, status: "aprovado" | "bloqueado") => {
    const { error } = await (supabase as any)
      .from("lojas")
      .update({ status })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "aprovado" ? "Loja aprovada" : "Loja bloqueada");
    invalidate();
  };

  const remove = async (id: string, nome: string) => {
    if (!confirm(`Excluir a loja "${nome}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from("lojas").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Loja excluída");
    invalidate();
  };

  const toggleCatalogo = async (id: string, atual: boolean) => {
    const { error } = await (supabase as any)
      .from("lojas")
      .update({ catalogo_ativo: !atual })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(!atual ? "Catálogo ativado" : "Catálogo desativado");
    invalidate();
  };

  return { lojas, isLoading, setStatus, remove, toggleCatalogo, invalidate };
}
