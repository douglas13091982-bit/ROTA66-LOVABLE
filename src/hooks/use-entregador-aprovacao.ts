import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type StatusContaEntregador = "pendente" | "aprovado" | "bloqueado";

/**
 * Lê o status de aprovação do entregador (`entregador_status_conta`).
 * Quando não existe registro, considera "pendente" — assim contas recém
 * criadas ficam bloqueadas até o admin aprovar.
 */
export function useEntregadorAprovacao() {
  const { user } = useAuth();
  const userId = user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["entregador-status-conta", userId],
    enabled: !!userId,
    refetchInterval: 30_000,
    queryFn: async (): Promise<StatusContaEntregador> => {
      const { data } = await (supabase as any)
        .from("entregador_status_conta")
        .select("status")
        .eq("entregador_id", userId!)
        .maybeSingle();
      return ((data?.status as StatusContaEntregador) ?? "pendente");
    },
  });

  const status = data ?? "pendente";
  return {
    status,
    isLoading,
    aprovado: status === "aprovado",
    bloqueado: status === "bloqueado",
    pendente: status === "pendente",
  };
}
