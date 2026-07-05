/**
 * Valor líquido que o entregador recebe por uma entrega.
 *
 * Modelo: o cliente paga taxa_entrega = tarifa global (frete) + taxa por
 * pedido do plano da loja. O entregador recebe apenas a parcela da tarifa
 * global; a taxa por pedido fica retida com a loja para repassar ao sistema.
 *
 * Quando o plano mensal da loja está ativo, a taxa por pedido é zero e o
 * entregador recebe integralmente a taxa de entrega.
 */
export function liquidoEntregador(
  taxaEntrega: number | string | null | undefined,
  lojaTaxaPorPedido?: number | string | null,
  planoMensalAtivo?: boolean | null,
): number {
  const taxa = Number(taxaEntrega);
  if (!Number.isFinite(taxa) || taxa <= 0) return 0;
  const desconto = planoMensalAtivo ? 0 : Number(lojaTaxaPorPedido ?? 0) || 0;
  const liquido = Math.max(0, taxa - desconto);
  return Number(liquido.toFixed(2));
}
