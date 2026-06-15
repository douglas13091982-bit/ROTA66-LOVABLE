import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ContratoRow } from "../logic/types";

export function useContratos() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["admin-contratos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contratos")
        .select("*")
        .order("versao", { ascending: false });
      if (error) throw error;
      return data as ContratoRow[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-contratos"] });

  const salvar = async (id: string, titulo: string, conteudo: string) => {
    const { error } = await (supabase as any)
      .from("contratos")
      .update({ titulo, conteudo })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
      return false;
    }
    toast.success("Contrato salvo");
    invalidate();
    return true;
  };

  const ativar = async (id: string) => {
    const { error } = await (supabase as any)
      .from("contratos")
      .update({ ativo: true })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao ativar", { description: error.message });
      return false;
    }
    toast.success("Versão ativada");
    invalidate();
    return true;
  };

  const criarNovaVersao = async (contratos: ContratoRow[], base: ContratoRow | null) => {
    const proxima =
      contratos.length > 0 ? Math.max(...contratos.map((c) => c.versao)) + 1 : 1;
    const ref = base ?? contratos[0];
    const { data, error } = await (supabase as any)
      .from("contratos")
      .insert({
        titulo: ref?.titulo ?? "Termos de Uso",
        conteudo: ref?.conteudo ?? "",
        versao: proxima,
        ativo: false,
      })
      .select()
      .maybeSingle();
    if (error) {
      toast.error("Erro ao criar versão", { description: error.message });
      return null;
    }
    toast.success(`Versão ${proxima} criada (rascunho)`);
    await invalidate();
    return data as ContratoRow;
  };

  return { ...query, salvar, ativar, criarNovaVersao };
}
