import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SaqueResumo = {
  saldo: number;
  total_recebido: number;
  total_sacado: number;
  valor_minimo: number;
  dia_semana_permitido: number;
  modo: "dia_semana" | "valor";
  pode_sacar_hoje: boolean;
  tem_saque_pendente: boolean;
};


export type SaqueRow = {
  id: string;
  valor: number;
  pix_chave: string;
  status: "solicitado" | "aprovado" | "pago" | "rejeitado" | "cancelado";
  solicitado_em: string;
  pago_em: string | null;
  rejeitado_em: string | null;
  motivo_rejeicao: string | null;
  comprovante_url: string | null;
};

export function useSaqueEntregador() {
  const qc = useQueryClient();

  const resumoQ = useQuery({
    queryKey: ["entregador-saque-resumo"],
    queryFn: async (): Promise<SaqueResumo | null> => {
      const { data, error } = await supabase.rpc("entregador_saldo_saque_resumo");
      if (error) throw error;
      return ((data as any)?.[0] ?? null) as SaqueResumo | null;
    },
  });

  const saquesQ = useQuery({
    queryKey: ["entregador-saques"],
    queryFn: async (): Promise<SaqueRow[]> => {
      const { data, error } = await supabase
        .from("entregador_saques")
        .select("id, valor, pix_chave, status, solicitado_em, pago_em, rejeitado_em, motivo_rejeicao, comprovante_url")
        .order("solicitado_em", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as SaqueRow[];
    },
  });

  const perfilQ = useQuery({
    queryKey: ["entregador-perfil-pix"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("pix_chave")
        .eq("id", uid)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const solicitarM = useMutation({
    mutationFn: async (params: { valor: number; pix_chave: string }) => {
      const { data, error } = await supabase.rpc("entregador_solicitar_saque", {
        _valor: params.valor,
        _pix_chave: params.pix_chave,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      toast.success("Saque solicitado com sucesso");
      qc.invalidateQueries({ queryKey: ["entregador-saque-resumo"] });
      qc.invalidateQueries({ queryKey: ["entregador-saques"] });
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Erro ao solicitar saque");
    },
  });

  return { resumoQ, saquesQ, perfilQ, solicitarM };
}

export const DIAS_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];
