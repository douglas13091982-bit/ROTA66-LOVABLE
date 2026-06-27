import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { SaqueFilter, SaqueRow, StatusSaque } from "../logic/types";

export function useSaquesEntregadores() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<SaqueFilter>("pendentes");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-saques-entregadores", filter],
    queryFn: async (): Promise<SaqueRow[]> => {
      let query = (supabase as any)
        .from("entregador_saques")
        .select("*")
        .order("solicitado_em", { ascending: false });

      if (filter === "pendentes") {
        query = query.eq("status", "pendente");
      } else if (filter === "pagos") {
        query = query.eq("status", "pago");
      } else if (filter === "rejeitados") {
        query = query.eq("status", "rejeitado");
      }

      const { data: saques, error } = await query;
      if (error) throw error;

      const ids = (saques ?? []).map((s: any) => s.entregador_id);
      let profileMap: Record<string, { full_name: string | null; phone: string | null }> = {};
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, phone")
          .in("id", ids);
        profileMap = Object.fromEntries(
          (profiles ?? []).map((p: any) => [
            p.id,
            { full_name: p.full_name ?? null, phone: p.phone ?? null },
          ])
        );
      }

      return (saques ?? []).map((s: any): SaqueRow => {
        const prof = profileMap[s.entregador_id] ?? {};
        return {
          id: s.id,
          entregador_id: s.entregador_id,
          entregador_nome: prof.full_name ?? null,
          entregador_phone: prof.phone ?? null,
          valor: Number(s.valor ?? 0),
          pix_chave: s.pix_chave ?? "",
          status: s.status as StatusSaque,
          solicitado_em: s.solicitado_em,
          pago_em: s.pago_em ?? null,
          rejeitado_em: s.rejeitado_em ?? null,
          motivo_rejeicao: s.motivo_rejeicao ?? null,
          comprovante_url: s.comprovante_url ?? null,
          observacoes_admin: s.observacoes_admin ?? null,
        };
      });
    },
  });

  const invalidate = useCallback(
    () => qc.invalidateQueries({ queryKey: ["admin-saques-entregadores"] }),
    [qc]
  );

  const marcarPago = useCallback(
    async (id: string) => {
      const { error } = await (supabase as any)
        .from("entregador_saques")
        .update({ status: "pago", pago_em: new Date().toISOString() })
        .eq("id", id);
      if (error) return toast.error(error.message);
      toast.success("Saque marcado como pago");
      invalidate();
    },
    [invalidate]
  );

  const rejeitar = useCallback(
    async (id: string, motivo: string) => {
      const { error } = await (supabase as any)
        .from("entregador_saques")
        .update({
          status: "rejeitado",
          rejeitado_em: new Date().toISOString(),
          motivo_rejeicao: motivo.trim(),
        })
        .eq("id", id);
      if (error) return toast.error(error.message);
      toast.success("Saque rejeitado");
      invalidate();
    },
    [invalidate]
  );

  const filtered = useMemo(() => data ?? [], [data]);

  return {
    saques: filtered,
    isLoading,
    filter,
    setFilter,
    marcarPago,
    rejeitar,
  };
}
