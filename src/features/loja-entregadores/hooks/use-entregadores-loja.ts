import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Vinculo } from "../logic/types";

export function useEntregadoresLoja(lojaId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["entregadores", lojaId],
    enabled: !!lojaId,
    queryFn: async (): Promise<Vinculo[]> => {
      const { data, error } = await supabase.rpc("listar_entregadores_loja", {
        _loja_id: lojaId!,
      });
      if (error) throw error;
      return (data ?? []).map((v: any) => ({
        id: v.vinculo_id,
        ativo: v.ativo,
        entregador_id: v.entregador_id,
        profile: {
          full_name: v.full_name,
          phone: v.phone,
          avatar_url: v.avatar_url,
        },
      }));
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["entregadores", lojaId] });

  async function toggleAtivo(id: string, ativo: boolean) {
    await supabase.from("loja_entregadores").update({ ativo: !ativo }).eq("id", id);
    invalidate();
  }

  async function remove(id: string) {
    await supabase.from("loja_entregadores").delete().eq("id", id);
    invalidate();
    toast.success("Vínculo removido");
  }

  return { vinculos: query.data, isLoading: query.isLoading, toggleAtivo, remove, invalidate };
}
