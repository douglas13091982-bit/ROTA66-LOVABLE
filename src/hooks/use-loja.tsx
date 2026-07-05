import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLojaSuporteId } from "@/hooks/use-loja-suporte";

const SELECT_COLS =
  "*, plano:planos_loja!lojas_plano_id_fkey(id, nome, mensalidade_valor, taxa_por_pedido)";

export function useMinhaLoja() {
  const { user, roles } = useAuth();
  const suporteLojaId = useLojaSuporteId();
  const isSuper = roles.includes("super_admin");
  // Só permitimos override se o usuário for super_admin — a RLS já bloqueia
  // qualquer outro caso, mas evitamos requisições desnecessárias.
  const alvoId = isSuper ? suporteLojaId : null;

  return useQuery({
    queryKey: ["minha-loja", user?.id, alvoId ?? "self"],
    enabled: !!user?.id,
    queryFn: async () => {
      // Também trazemos o plano vinculado para que a UI use a taxa/mensalidade
      // do plano como fonte de verdade — as colunas legadas em `lojas`
      // podem estar desatualizadas depois de uma troca de plano.
      const q = supabase.from("lojas").select(SELECT_COLS);
      const { data, error } = alvoId
        ? await q.eq("id", alvoId).maybeSingle()
        : await q.eq("owner_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
