import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Indicador =
  | { tipo: "entregador"; id: string; nome: string }
  | { tipo: "revendedor"; id: string; nome: string };

export function useIndicador(codigo: string | undefined) {
  const code = (codigo ?? "").trim().toUpperCase();
  const { data } = useQuery<Indicador | null>({
    queryKey: ["indicador", code],
    enabled: code.length >= 4,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // 1. Tenta revendedor primeiro (códigos começam com R)
      const rev = await (supabase as any).rpc("buscar_revendedor_por_codigo", { _codigo: code });
      const rrow = Array.isArray(rev.data) ? rev.data[0] : rev.data;
      if (!rev.error && rrow?.user_id) {
        return { tipo: "revendedor", id: rrow.user_id as string, nome: (rrow.nome as string) ?? "" };
      }
      // 2. Fallback entregador
      const ent = await (supabase as any).rpc("buscar_indicador_por_codigo", { _codigo: code });
      const erow = Array.isArray(ent.data) ? ent.data[0] : ent.data;
      if (!ent.error && erow?.id) {
        return { tipo: "entregador", id: erow.id as string, nome: (erow.full_name as string) ?? "" };
      }
      return null;
    },
  });
  // Backwards-compat: expose fullName for existing consumers
  if (!data) return null;
  return { ...data, fullName: data.nome };
}
