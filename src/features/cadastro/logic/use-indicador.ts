import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useIndicador(codigo: string | undefined) {
  const code = (codigo ?? "").trim().toUpperCase();
  const { data } = useQuery({
    queryKey: ["indicador", code],
    enabled: code.length >= 4,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("buscar_indicador_por_codigo", {
        _codigo: code,
      });
      if (error) return null;
      const row = Array.isArray(data) ? data[0] : data;
      return row ? { id: row.id as string, fullName: (row.full_name as string) ?? "" } : null;
    },
  });
  return data ?? null;
}
