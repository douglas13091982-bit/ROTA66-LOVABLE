import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ConfigCreditos } from "../logic/types";

export function useCreditosConfig() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["admin-creditos-config"],
    queryFn: async (): Promise<ConfigCreditos | null> => {
      const { data, error } = await supabase.rpc("get_config_creditos_admin" as any);
      if (error) throw error;
      return ((data as any)?.[0] ?? null) as ConfigCreditos | null;
    },
  });

  const salvar = async (f: ConfigCreditos) => {
    const { error } = await supabase.rpc("salvar_config_creditos" as any, {
      _ativo: !!f.ativo,
      _mensalidade: Number(f.mensalidade_valor) || 0,
      _dia: Number(f.dia_vencimento) || 1,
      _saldo_minimo: Number(f.saldo_minimo) || 0,
      _mp_access_token: f._mp_access_token_novo ?? "",
      _mp_public_key: f.mp_public_key ?? "",
      _valores_sugeridos: [],
    });
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Configuração salva");
    qc.invalidateQueries({ queryKey: ["admin-creditos-config"] });
    return true;
  };

  return { ...query, salvar };
}
