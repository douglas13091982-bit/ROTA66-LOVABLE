/**
 * Calculadora do valor exibido no card do pool do entregador.
 *
 * ⚠️ REGRA FIXA (não alterar sem alinhar com liquidoEntregador + trigger
 * `processar_saldos_pedido_entregue` no banco):
 *
 *   cliente paga = frete_global + adicional_retorno_cartao + taxa_por_pedido_loja
 *   entregador   = taxa_entrega - taxa_por_pedido_loja
 *
 * O adicional de retorno do cartão (km × valor por km configurado no sistema)
 * já vem embutido em `taxa_entrega` — não há mais frete dobrado.
 * Esta função DEVE retornar exatamente o líquido do entregador, para que
 * o card no pool não prometa um valor diferente do crédito na carteira.
 * Consumidores (ex.: PedidoListItem) NUNCA devem re-envolver o resultado
 * em `liquidoEntregador` — isso causa subtração dupla (bug histórico).
 */
import { haversineKm } from "@/lib/geo";
import { liquidoEntregador } from "@/hooks/use-taxa-sistema";
import { calcularTarifaPorFaixa } from "@/lib/tarifa-calculator";
import type { PedidoDisponivel, TarifaFaixa } from "@/types/pedido";

export function criarCalculadorTaxaExibida(
  tarifasGlobais: TarifaFaixa[] | undefined,
) {
  return (p: PedidoDisponivel): number => {
    const taxaPlano = Number(p.loja_taxa_por_pedido ?? 0) || 0;

    const taxaSalva = Number(p.taxa_entrega);
    if (Number.isFinite(taxaSalva) && taxaSalva > 0) {
      return liquidoEntregador(
        taxaSalva,
        taxaPlano,
        p.loja_plano_mensal_ativo,
        p.forma_pagamento,
      );
    }

    const freteGlobalMinimo = calcularTarifaPorFaixa(0, tarifasGlobais ?? []) ?? 0;
    let frete = freteGlobalMinimo;
    if (
      p.endereco_coleta_lat != null &&
      p.endereco_coleta_lng != null &&
      p.endereco_entrega_lat != null &&
      p.endereco_entrega_lng != null
    ) {
      const km = haversineKm(
        Number(p.endereco_coleta_lat),
        Number(p.endereco_coleta_lng),
        Number(p.endereco_entrega_lat),
        Number(p.endereco_entrega_lng),
      );
      frete = calcularTarifaPorFaixa(km, tarifasGlobais ?? []) ?? freteGlobalMinimo;
    }
    return liquidoEntregador(
      frete + taxaPlano,
      taxaPlano,
      p.loja_plano_mensal_ativo,
      p.forma_pagamento,
    );
  };
}
