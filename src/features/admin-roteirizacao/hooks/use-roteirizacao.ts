import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { validateAndBuild, type RoteirizacaoForm } from "../logic/form";

const QK = ["config-roteirizacao"];

export function useRoteirizacao() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QK,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_roteirizacao")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const salvar = async (form: RoteirizacaoForm) => {
    if (!query.data?.id) {
      toast.error("Config ainda não carregou");
      return false;
    }
    const res = validateAndBuild(form);
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    const { error } = await supabase
      .from("config_roteirizacao")
      .update(res.payload as any)
      .eq("id", query.data.id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Configuração salva");
    qc.invalidateQueries({ queryKey: QK });
    return true;
  };

  return { ...query, salvar };
}
