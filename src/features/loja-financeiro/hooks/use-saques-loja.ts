import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ResumoSaqueLoja = {
  saldo: number;
  valor_minimo: number;
  pode_sacar_hoje: boolean;
  tem_saque_pendente: boolean;
  ultimo_saque_em: string | null;
};

export type SaqueLojaRow = {
  id: string;
  valor: number;
  pix_chave: string;
  status: "solicitado" | "pago" | "rejeitado" | "cancelado";
  solicitado_em: string;
  pago_em: string | null;
  rejeitado_em: string | null;
  motivo_rejeicao: string | null;
};

export function useSaquesLoja(lojaId: string) {
  const qc = useQueryClient();

  const resumoQ = useQuery({
    queryKey: ["loja-saque-resumo", lojaId],
    queryFn: async (): Promise<ResumoSaqueLoja | null> => {
      const { data, error } = await (supabase as any).rpc("loja_saldo_saque_resumo", { _loja_id: lojaId });
      if (error) throw error;
      return ((data as any)?.[0] ?? null) as ResumoSaqueLoja | null;
    },
    enabled: !!lojaId,
  });

  const saquesQ = useQuery({
    queryKey: ["loja-saques", lojaId],
    queryFn: async (): Promise<SaqueLojaRow[]> => {
      const { data, error } = await (supabase as any)
        .from("lojas_saques")
        .select("id, valor, pix_chave, status, solicitado_em, pago_em, rejeitado_em, motivo_rejeicao")
        .eq("loja_id", lojaId)
        .order("solicitado_em", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as SaqueLojaRow[];
    },
    enabled: !!lojaId,
  });

  const solicitarM = useMutation({
    mutationFn: async (p: { valor: number; pix_chave: string }) => {
      const { data, error } = await (supabase as any).rpc("loja_solicitar_saque", {
        _loja_id: lojaId,
        _valor: p.valor,
        _pix_chave: p.pix_chave,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      toast.success("Saque solicitado com sucesso");
      qc.invalidateQueries({ queryKey: ["loja-saque-resumo", lojaId] });
      qc.invalidateQueries({ queryKey: ["loja-saques", lojaId] });
      qc.invalidateQueries({ queryKey: ["loja-saldo"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao solicitar saque"),
  });

  return { resumoQ, saquesQ, solicitarM };
}
