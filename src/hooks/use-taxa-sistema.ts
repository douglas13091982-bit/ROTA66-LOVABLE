/**
 * Valor líquido que o entregador recebe por uma entrega.
 *
 * Modelo: o cliente paga taxa_entrega = tarifa global (frete) + taxa por
 * pedido do plano da loja. O entregador recebe apenas a parcela da tarifa
 * global; a taxa por pedido fica retida com a loja para repassar ao sistema.
 *
 * NÃO existe mais frete dobrado para pagamento em cartão. Quando a entrega
 * exige retorno com a maquininha, a loja marca "Retorno com máquina" no
 * pedido manual: o adicional por km já entra na `taxa_entrega` (cobrado do
 * cliente) e portanto é repassado integralmente ao entregador.
 *
 * Mantém paridade com o trigger `processar_saldos_pedido_entregue` no banco.
 */
export function liquidoEntregador(
  taxaEntrega: number | string | null | undefined,
  lojaTaxaPorPedido?: number | string | null,
  _planoMensalAtivo?: boolean | null,
  _formaPagamento?: string | null,
): number {
  const taxa = Number(taxaEntrega);
  if (!Number.isFinite(taxa) || taxa <= 0) return 0;
  const desconto = Number(lojaTaxaPorPedido ?? 0) || 0;
  const liquido = Math.max(0, taxa - desconto);
  return Number(liquido.toFixed(2));
}
