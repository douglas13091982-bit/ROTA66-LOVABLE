import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useFranquia } from "@/hooks/use-franquia";
import { notificarEntregadorAprovado } from "@/lib/push.functions";
import type { EntregadorRow, StatusEntregador } from "../logic/types";



export function useAdminEntregadores() {
  const { user } = useAuth();
  const { config: franqueadoConfig } = useFranquia();
  const qc = useQueryClient();


  const { data, isLoading } = useQuery({
    queryKey: ["admin-entregadores", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<EntregadorRow[]> => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "entregador");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const [{ data: profiles }, { data: statuses }, { data: saldos }] = await Promise.all([
        supabase.from("profiles").select("*").in("id", ids),
        (supabase as any)
          .from("entregador_status_conta")
          .select("*")
          .in("entregador_id", ids),
        (supabase as any)
          .from("entregadores_saldo_saque")
          .select("entregador_id, saldo")
          .in("entregador_id", ids),
      ]);
      const stMap = new Map<string, any>(
        (statuses ?? []).map((s: any) => [s.entregador_id, s])
      );
      const saldoMap = new Map<string, number>(
        (saldos ?? []).map((s: any) => [s.entregador_id, Number(s.saldo) || 0])
      );
      // A lista final usa apenas profiles que o RLS liberou para este admin.
      // Para franqueado, isso remove entregadores sem city_id ou de outra cidade.
      const rows = (profiles ?? []).map((p: any) => {
        const id = p.id;
        return {
          id,
          full_name: p.full_name ?? null,
          email: p.email ?? null,
          phone: p.phone ?? null,
          avatar_url: p.avatar_url ?? null,
          tipo_veiculo: p.tipo_veiculo ?? null,
          ...p,
          created_at: p.created_at ?? null,
          status: stMap.get(id)?.status ?? "pendente",
          saldo_carteira: saldoMap.get(id) ?? 0,
        };
      });
      rows.sort((a: any, b: any) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
      return rows;
    },
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["admin-entregadores"] });

  const setStatus = async (entregador_id: string, status: StatusEntregador) => {
    const { error } = await (supabase as any)
      .from("entregador_status_conta")
      .upsert({ entregador_id, status }, { onConflict: "entregador_id" });
    if (error) return toast.error(error.message);

    // Ao aprovar: se o entregador ainda não tem cidade atribuída e quem aprova
    // é um franqueado (tem city_id), atribuímos automaticamente a cidade dele.
    if (status === "aprovado" && (franqueadoConfig as any)?.city_id) {
      const alvo = (data ?? []).find((e) => e.id === entregador_id);
      if (alvo && !(alvo as any).city_id) {
        await (supabase as any).rpc("atribuir_cidade_entregador", {
          _entregador_id: entregador_id,
          _city_id: (franqueadoConfig as any).city_id,
        });
      }
    }


    if (status === "aprovado") {
      try {
        await notificarEntregadorAprovado({ data: { entregador_id } });
      } catch (e) {
        console.error("[notificar-aprovado] falhou", e);
      }
    }

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
