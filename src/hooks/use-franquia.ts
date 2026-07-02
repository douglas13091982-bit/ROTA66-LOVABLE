import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type FranqueadoConfig = {
  user_id: string;
  cidade: string;
  mensalidade_valor: number;
  dia_vencimento: number;
  ativo: boolean;
  bloqueado_por_inadimplencia: boolean;
  dias_tolerancia: number;
};

/**
 * Retorna:
 * - isOwner: super_admin sem registro em franqueados_config (você, o dono da franquia)
 * - isFranqueado: super_admin COM registro (franqueado de cidade)
 * - cidade: cidade do franqueado (undefined se owner)
 * - bloqueado: true se franqueado bloqueado por inadimplência
 */
export function useFranquia() {
  const { user, roles } = useAuth();
  const isSuper = roles.includes("super_admin");

  const q = useQuery({
    queryKey: ["franqueado-config", user?.id],
    enabled: !!user && isSuper,
    queryFn: async (): Promise<FranqueadoConfig | null> => {
      const { data, error } = await (supabase as any)
        .from("franqueados_config")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as FranqueadoConfig) ?? null;
    },
  });

  const cfg = q.data ?? null;
  const isFranqueado = isSuper && !!cfg;
  const isOwner = isSuper && !cfg;

  return {
    loading: q.isLoading,
    isSuper,
    isOwner,
    isFranqueado,
    cidade: cfg?.cidade,
    bloqueado: !!cfg?.bloqueado_por_inadimplencia,
    config: cfg,
  };
}
