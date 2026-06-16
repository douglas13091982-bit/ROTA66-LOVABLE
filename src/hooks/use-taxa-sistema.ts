import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Retorna a taxa que o sistema desconta do entregador por pedido entregue.
 *
 * Lê via RPC `get_taxa_sistema` (SECURITY DEFINER) porque a tabela
 * `config_financeiro` só é legível pelo super_admin via RLS — antes a query
 * direta retornava `[]` para entregadores e o cálculo caía num fallback
 * silencioso de `2`, distorcendo o ganho líquido.
 *
 * Sem fallback mágico: se a configuração estiver ausente ou a chamada
 * falhar, retorna `0` e loga o erro no console (cálculos ficam visivelmente
 * errados em vez de silenciosamente errados).
 */
export function useTaxaSistema(): number {
  const { data } = useQuery({
    queryKey: ["config-financeiro-taxa"],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_taxa_sistema");
      if (error) {
        console.error("[useTaxaSistema] Falha ao buscar taxa do sistema:", error);
        return 0;
      }
      if (data === null || data === undefined) {
        console.error(
          "[useTaxaSistema] config_financeiro.taxa_por_pedido não está definida — cálculo de ganho líquido ficará incorreto.",
        );
        return 0;
      }
      return Number(data);
    },
  });
  return Number(data ?? 0);
}

/**
 * Calcula o valor líquido que o entregador recebe.
 *
 * - Se a loja tem **plano mensal ativo**, o entregador recebe o **valor cheio**
 *   da taxa (a loja já paga a plataforma via mensalidade).
 * - Se não tem plano, é descontada a tarifa do sistema por pedido.
 */
export function liquidoEntregador(
  taxaEntrega: number | string | null | undefined,
  taxaSistema: number,
  lojaPlanoMensalAtivo?: boolean | null,
) {
  const bruto = Number(taxaEntrega) || 0;
  if (lojaPlanoMensalAtivo) return Math.max(0, bruto);
  return Math.max(0, bruto - taxaSistema);
}
