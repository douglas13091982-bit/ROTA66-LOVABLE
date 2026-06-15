import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function useTarifasLoja(lojaId: string) {
  const qc = useQueryClient();
  const key = ["tarifas-loja", lojaId] as const;
  const [form, setForm] = useState({
    faixa_km_min: "0",
    faixa_km_max: "5",
    valor: "8.00",
    valor_minimo: "8.00",
    valor_por_km: "0",
  });
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tarifas_loja")
        .select("*")
        .eq("loja_id", lojaId)
        .order("faixa_km_min", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await (supabase as any).from("tarifas_loja").insert({
      loja_id: lojaId,
      tipo_veiculo: "moto",
      faixa_km_min: Number(form.faixa_km_min),
      faixa_km_max: Number(form.faixa_km_max),
      valor: Number(form.valor),
      valor_minimo: Number(form.valor_minimo),
      valor_por_km: Number(form.valor_por_km),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Tarifa criada");
    invalidate();
  }

  async function remove(id: string) {
    await (supabase as any).from("tarifas_loja").delete().eq("id", id);
    invalidate();
  }

  async function toggle(id: string, ativa: boolean) {
    await (supabase as any)
      .from("tarifas_loja")
      .update({ ativa: !ativa })
      .eq("id", id);
    invalidate();
  }

  return { data, isLoading, form, setForm, saving, add, remove, toggle };
}
