/**
 * Valor líquido que o entregador recebe por uma entrega.
 *
 * Modelo: o cliente paga taxa_entrega = tarifa global (frete) + taxa por
 * pedido do plano da loja. O entregador recebe apenas a parcela da tarifa
 * global; a taxa por pedido fica retida com a loja para repassar ao sistema.
 *
 * A taxa por pedido do plano é sempre descontada, independente do plano
 * mensal estar ativo — os planos podem cobrar mensalidade E taxa por pedido.
 * O parâmetro `planoMensalAtivo` é mantido apenas por compatibilidade.
 */
export function liquidoEntregador(
  taxaEntrega: number | string | null | undefined,
  lojaTaxaPorPedido?: number | string | null,
  _planoMensalAtivo?: boolean | null,
): number {
  const taxa = Number(taxaEntrega);
  if (!Number.isFinite(taxa) || taxa <= 0) return 0;
  const desconto = Number(lojaTaxaPorPedido ?? 0) || 0;
  const liquido = Math.max(0, taxa - desconto);
  return Number(liquido.toFixed(2));
}
