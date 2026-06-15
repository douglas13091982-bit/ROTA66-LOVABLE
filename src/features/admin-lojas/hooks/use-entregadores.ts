import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Resumo (total/online) mostrado no cabeçalho do card da loja. */
export function useEntregadoresResumo(lojaId: string) {
  return useQuery({
    queryKey: ["admin-loja-entregadores-resumo", lojaId],
    queryFn: async () => {
      const { data: vinc } = await supabase
        .from("loja_entregadores")
        .select("entregador_id, ativo")
        .eq("loja_id", lojaId)
        .eq("ativo", true);
      const ids = (vinc ?? []).map((v: any) => v.entregador_id);
      if (ids.length === 0) return { total: 0, online: 0 };
      const { data: stat } = await supabase
        .from("entregador_status")
        .select("entregador_id, online")
        .in("entregador_id", ids);
      const online = (stat ?? []).filter((s: any) => s.online).length;
      return { total: ids.length, online };
    },
    refetchInterval: 30_000,
  });
}

/** Lista completa de entregadores vinculados, com profile + status online. */
export function useEntregadoresDaLoja(lojaId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["admin-loja-entregadores", lojaId],
    enabled,
    queryFn: async () => {
      const { data: vinc, error } = await supabase
        .from("loja_entregadores")
        .select("id, ativo, entregador_id, created_at")
        .eq("loja_id", lojaId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = (vinc ?? []).map((v) => v.entregador_id);
      if (ids.length === 0) return [];

      const [{ data: profs }, { data: stat }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, phone").in("id", ids),
        supabase
          .from("entregador_status")
          .select("entregador_id, online, updated_at")
          .in("entregador_id", ids),
      ]);
      const mapP = new Map((profs ?? []).map((p: any) => [p.id, p]));
      const mapS = new Map((stat ?? []).map((s: any) => [s.entregador_id, s]));
      return (vinc ?? []).map((v) => ({
        vinculo_id: v.id,
        ativo: v.ativo,
        id: v.entregador_id,
        full_name: mapP.get(v.entregador_id)?.full_name ?? null,
        phone: mapP.get(v.entregador_id)?.phone ?? null,
        online: mapS.get(v.entregador_id)?.online ?? false,
      }));
    },
    refetchInterval: enabled ? 20_000 : false,
  });
}
