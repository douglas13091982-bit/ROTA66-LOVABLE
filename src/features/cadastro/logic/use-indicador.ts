import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Indicador =
  | { tipo: "entregador"; id: string; nome: string };

export function useIndicador(codigo: string | undefined) {
  const code = (codigo ?? "").trim().toUpperCase();
  const { data } = useQuery<Indicador | null>({
    queryKey: ["indicador", code],
    enabled: code.length >= 4,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // Tenta entregador
      const ent = await (supabase as any).rpc("buscar_indicador_por_codigo", { _codigo: code });
      const erow = Array.isArray(ent.data) ? ent.data[0] : ent.data;
      if (!ent.error && erow?.id) {
        return { tipo: "entregador", id: erow.id as string, nome: (erow.full_name as string) ?? "" };
      }
      return null;
    },
  });
  if (!data) return null;
  return { ...data, fullName: data.nome };
}
