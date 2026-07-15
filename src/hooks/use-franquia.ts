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
 * - isOwner: super_admin sem registro em franqueados_config e sem vínculo de colaborador (dono da franquia)
 * - isFranqueado: super_admin COM registro (franqueado de cidade) OU colaborador vinculado (herda cidade/config)
 * - isColaborador: usuário vinculado como colaborador de um franqueado
 * - cidade: cidade do franqueado (undefined se owner)
 * - bloqueado: true se franqueado bloqueado por inadimplência (colaboradores herdam)
 */
export function useFranquia() {
  const { user, roles } = useAuth();
  const isSuper = roles.includes("super_admin");

  const q = useQuery({
    queryKey: ["franqueado-config", user?.id],
    enabled: !!user && isSuper,
    queryFn: async (): Promise<{ config: FranqueadoConfig | null; isColaborador: boolean }> => {
      // 1) É franqueado próprio?
      const { data: own, error: errOwn } = await (supabase as any)
        .from("franqueados_config")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (errOwn) throw errOwn;
      if (own) return { config: own as FranqueadoConfig, isColaborador: false };

      // 2) É colaborador? Busca o vínculo e carrega config do franqueado dono
      const { data: vinculo, error: errV } = await (supabase as any)
        .from("franqueado_colaboradores")
        .select("franqueado_user_id")
        .eq("colaborador_user_id", user!.id)
        .eq("ativo", true)
        .maybeSingle();
      if (errV) throw errV;
      if (!vinculo?.franqueado_user_id) return { config: null, isColaborador: false };

      const { data: cfg, error: errC } = await (supabase as any)
        .from("franqueados_config")
        .select("*")
        .eq("user_id", vinculo.franqueado_user_id)
        .maybeSingle();
      if (errC) throw errC;
      return { config: (cfg as FranqueadoConfig) ?? null, isColaborador: true };
    },
  });

  const cfg = q.data?.config ?? null;
  const isColaborador = !!q.data?.isColaborador;
  const isFranqueado = isSuper && !!cfg; // colaboradores herdam essa flag para ver menus de franqueado
  const isOwner = isSuper && !cfg && !isColaborador;

  return {
    loading: q.isLoading,
    isSuper,
    isOwner,
    isFranqueado,
    isColaborador,
    cidade: cfg?.cidade,
    bloqueado: !!cfg?.bloqueado_por_inadimplencia,
    config: cfg,
  };
}
