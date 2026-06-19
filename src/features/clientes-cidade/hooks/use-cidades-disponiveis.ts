import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CidadeDisponivel {
  cidade: string;
  estado: string | null;
}

export function useCidadesDisponiveis() {
  return useQuery({
    queryKey: ["clientes-cidades-disponiveis"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lojas_publicas")
        .select("cidade, estado")
        .eq("catalogo_ativo", true);
      if (error) throw error;
      const set = new Map<string, CidadeDisponivel>();
      for (const row of (data ?? []) as CidadeDisponivel[]) {
        if (!row.cidade) continue;
        const key = `${row.cidade.trim().toLowerCase()}|${(row.estado ?? "").trim().toLowerCase()}`;
        if (!set.has(key)) set.set(key, { cidade: row.cidade.trim(), estado: row.estado?.trim() ?? null });
      }
      return Array.from(set.values()).sort((a, b) => a.cidade.localeCompare(b.cidade));
    },
    staleTime: 5 * 60 * 1000,
  });
}
