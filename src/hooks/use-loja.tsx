import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLojaSuporteId } from "@/hooks/use-loja-suporte";

const SELECT_COLS =
  "*, plano:planos_loja!lojas_plano_id_fkey(id, nome, mensalidade_valor, taxa_por_pedido, max_funcionarios)";

export function useMinhaLoja() {
  const { user, roles } = useAuth();
  const suporteLojaId = useLojaSuporteId();
  const isSuper = roles.includes("super_admin");
  const alvoId = isSuper ? suporteLojaId : null;

  return useQuery({
    queryKey: ["minha-loja", user?.id, alvoId ?? "self"],
    enabled: !!user?.id,
    queryFn: async () => {
      const q = supabase.from("lojas").select(SELECT_COLS);
      if (alvoId) {
        const { data, error } = await q.eq("id", alvoId).maybeSingle();
        if (error) throw error;
        return data as any;
      }

      // 1) Tenta como dono da loja
      const { data: dono, error: errDono } = await supabase
        .from("lojas")
        .select(SELECT_COLS)
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (errDono) throw errDono;
      if (dono) return dono as any;

      // 2) Fallback: usuário é funcionário vinculado a uma loja
      const { data: vinculo } = await supabase
        .from("loja_funcionarios")
        .select("loja_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!vinculo?.loja_id) return null;

      const { data: lojaVinc, error: errVinc } = await supabase
        .from("lojas")
        .select(SELECT_COLS)
        .eq("id", vinculo.loja_id)
        .maybeSingle();
      if (errVinc) throw errVinc;
      return lojaVinc as any;
    },
  });
}

/**
 * Retorna true se o usuário logado é o dono (owner_id) da loja passada.
 * Funcionários da loja recebem `false`.
 */
export function useIsLojaOwner(loja: any | null | undefined) {
  const { user } = useAuth();
  if (!loja || !user) return false;
  return loja.owner_id === user.id;
}
