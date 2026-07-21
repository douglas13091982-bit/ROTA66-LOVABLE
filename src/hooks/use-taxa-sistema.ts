/**
 * Valor líquido que o entregador recebe por uma entrega.
 *
 * Modelo: o cliente paga taxa_entrega = tarifa global (frete) + taxa por
 * pedido do plano da loja. O entregador recebe apenas a parcela da tarifa
 * global; a taxa por pedido fica retida com a loja para repassar ao sistema.
 *
 * Regra do cartão na entrega: o entregador precisa voltar à loja para
 * devolver a maquininha, então recebe o frete DOBRADO. A diferença sai do
 * saldo da loja (cliente continua pagando o frete normal). Mantém paridade
 * com o trigger `processar_saldos_pedido_entregue` no banco.
 */
const CARTAO_FORMAS = new Set(["cartao", "cartao_credito", "cartao_debito"]);

export function liquidoEntregador(
  taxaEntrega: number | string | null | undefined,
  lojaTaxaPorPedido?: number | string | null,
  _planoMensalAtivo?: boolean | null,
  formaPagamento?: string | null,
): number {
  const taxa = Number(taxaEntrega);
  if (!Number.isFinite(taxa) || taxa <= 0) return 0;
  const desconto = Number(lojaTaxaPorPedido ?? 0) || 0;
  const freteBase = Math.max(0, taxa - desconto);
  const ehCartao = CARTAO_FORMAS.has((formaPagamento ?? "").toLowerCase());
  const liquido = ehCartao ? freteBase * 2 : freteBase;
  return Number(liquido.toFixed(2));
}

