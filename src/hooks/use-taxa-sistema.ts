/**
 * Valor líquido que o entregador recebe por uma entrega.
 *
 * Modelo: o cliente paga taxa_entrega = tarifa global (frete) + adicional de
 * retorno por km (quando o pagamento é em cartão na entrega) + taxa por
 * pedido do plano da loja. O entregador recebe tudo menos a taxa por pedido;
 * essa taxa fica retida com a loja para repassar ao sistema.
 *
 * Regra do cartão na entrega: o entregador precisa voltar à loja para
 * devolver a maquininha. Esse retorno NÃO dobra mais o frete — ele é cobrado
 * do cliente como km do retorno × valor por km configurado no sistema
 * (`config_financeiro.retorno_cartao_valor_por_km`) e já vem embutido em
 * `taxa_entrega`. Mantém paridade com o trigger
 * `processar_saldos_pedido_entregue` no banco.
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
