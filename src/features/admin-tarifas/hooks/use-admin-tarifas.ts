import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { TarifaFormState, TarifaRow } from "../logic/types";

const QK = ["admin-tarifas"];

export function useAdminTarifas() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QK,
    queryFn: async (): Promise<TarifaRow[]> => {
      const { data, error } = await supabase
        .from("tarifas_globais")
        .select("*")
        .order("tipo_veiculo")
        .order("faixa_km_min");
      if (error) throw error;
      return (data ?? []) as unknown as TarifaRow[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: QK });

  const add = async (form: TarifaFormState) => {
    const { error } = await (supabase as any).from("tarifas_globais").insert({
      tipo_veiculo: form.tipo_veiculo,
      faixa_km_min: Number(form.faixa_km_min),
      faixa_km_max: Number(form.faixa_km_max),
      valor: Number(form.valor),
      valor_minimo: Number(form.valor_minimo),
      valor_por_km: Number(form.valor_por_km),
    });
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Tarifa criada");
    invalidate();
    return true;
  };

  const remove = async (id: string) => {
    await supabase.from("tarifas_globais").delete().eq("id", id);
    invalidate();
    toast.success("Tarifa removida");
  };

  const toggle = async (id: string, ativa: boolean) => {
    await supabase.from("tarifas_globais").update({ ativa: !ativa }).eq("id", id);
    invalidate();
  };

  return { ...query, add, remove, toggle };
}
