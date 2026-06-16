import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { EntregadorRow, StatusEntregador } from "../logic/types";

export function useAdminEntregadores() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-entregadores"],
    queryFn: async (): Promise<EntregadorRow[]> => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "entregador");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const [{ data: profiles }, { data: statuses }] = await Promise.all([
        supabase.from("profiles").select("*").in("id", ids),
        (supabase as any)
          .from("entregador_status_conta")
          .select("*")
          .in("entregador_id", ids),
      ]);
      const profMap = new Map<string, any>(
        (profiles ?? []).map((p: any) => [p.id, p])
      );
      const stMap = new Map<string, any>(
        (statuses ?? []).map((s: any) => [s.entregador_id, s])
      );
      return ids.map((id) => {
        const p = profMap.get(id) ?? {};
        return {
          id,
          full_name: p.full_name ?? null,
          email: p.email ?? null,
          phone: p.phone ?? null,
          avatar_url: p.avatar_url ?? null,
          tipo_veiculo: p.tipo_veiculo ?? null,
          ...p,
          status: stMap.get(id)?.status ?? "pendente",
        };
      });
    },
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["admin-entregadores"] });

  const setStatus = async (entregador_id: string, status: StatusEntregador) => {
    const { error } = await (supabase as any)
      .from("entregador_status_conta")
      .upsert({ entregador_id, status }, { onConflict: "entregador_id" });
    if (error) return toast.error(error.message);
    toast.success(status === "aprovado" ? "Entregador aprovado" : "Entregador bloqueado");
    invalidate();
  };

  const remove = async (entregador_id: string, nome: string) => {
    if (
      !confirm(
        `Remover acesso do entregador "${nome}"? Vínculos com lojas também serão removidos.`
      )
    )
      return;
    await supabase.from("loja_entregadores").delete().eq("entregador_id", entregador_id);
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", entregador_id)
      .eq("role", "entregador");
    if (error) return toast.error(error.message);
    await (supabase as any)
      .from("entregador_status_conta")
      .delete()
      .eq("entregador_id", entregador_id);
    toast.success("Entregador removido");
    invalidate();
  };

  return { data: data ?? [], isLoading, setStatus, remove };
}
