import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SaldoLojaRow = {
  loja_id: string;
  loja_nome: string;
  saldo: number;
  updated_at: string | null;
};

export type RecargaMpRow = {
  id: string;
  loja_id: string;
  valor: number;
  status: string;
  mp_payment_id: string | null;
  aprovado_em: string | null;
  created_at: string;
  loja_nome: string;
};

export type MovimentoLojaRow = {
  id: string;
  tipo: string;
  valor: number;
  saldo_apos: number;
  descricao: string | null;
  created_at: string;
};

export function useAdminSaldosLojas() {
  const qc = useQueryClient();

  const saldosQ = useQuery({
    queryKey: ["admin-saldos-lojas"],
    queryFn: async (): Promise<SaldoLojaRow[]> => {
      const { data, error } = await supabase.rpc("super_admin_listar_saldos_lojas");
      if (error) throw error;
      return (data ?? []) as SaldoLojaRow[];
    },
  });

  const recargasQ = useQuery({
    queryKey: ["admin-recargas-loja-mp"],
    queryFn: async (): Promise<RecargaMpRow[]> => {
      const { data, error } = await supabase
        .from("lojas_recargas_mp")
        .select("id, loja_id, valor, status, mp_payment_id, aprovado_em, created_at, lojas:loja_id(nome)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        loja_id: r.loja_id,
        valor: Number(r.valor),
        status: r.status,
        mp_payment_id: r.mp_payment_id,
        aprovado_em: r.aprovado_em,
        created_at: r.created_at,
        loja_nome: r.lojas?.nome ?? "—",
      }));
    },
  });

  const recargaManualM = useMutation({
    mutationFn: async (params: { loja_id: string; valor: number; descricao?: string }) => {
      const { data, error } = await supabase.rpc("loja_recarregar_saldo_manual", {
        _loja_id: params.loja_id,
        _valor: params.valor,
        _descricao: params.descricao ?? "Ajuste manual super admin",
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: () => {
      toast.success("Saldo da loja atualizado");
      qc.invalidateQueries({ queryKey: ["admin-saldos-lojas"] });
      qc.invalidateQueries({ queryKey: ["admin-movimentos-loja"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Erro ao atualizar saldo"),
  });

  return { saldosQ, recargasQ, recargaManualM };
}

export function useMovimentosLoja(loja_id: string | null) {
  return useQuery({
    queryKey: ["admin-movimentos-loja", loja_id],
    enabled: !!loja_id,
    queryFn: async (): Promise<MovimentoLojaRow[]> => {
      const { data, error } = await supabase
        .from("lojas_saldo_movimentos")
        .select("id, tipo, valor, saldo_apos, descricao, created_at")
        .eq("loja_id", loja_id!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as MovimentoLojaRow[];
    },
  });
}
