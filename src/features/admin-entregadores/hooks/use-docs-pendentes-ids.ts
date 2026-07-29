import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** IDs dos entregadores com documentos aguardando revisão (status = "enviado"). */
export function useDocsPendentesIds() {
  const query = useQuery({
    queryKey: ["admin-docs-entregador-pendentes-ids"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await (supabase as any)
        .from("entregador_documentos")
        .select("entregador_id")
        .eq("status", "enviado");
      if (error) {
        console.warn("[useDocsPendentesIds]", error.message ?? error);
        return [];
      }
      return (data ?? []).map((d: any) => d.entregador_id as string);
    },
    refetchInterval: 30_000,
  });

  return new Set(query.data ?? []);
}
