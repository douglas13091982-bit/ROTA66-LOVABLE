/**
 * Calcula o valor líquido recebido pelo entregador por uma entrega.
 *
 * - Se a loja tem `plano_mensal_ativo = true`, o entregador recebe o valor cheio
 *   da `taxa_entrega` (a loja paga a mensalidade fixa).
 * - Caso contrário, desconta a `taxa_por_pedido` específica da loja (vinda do
 *   plano contratado). Nunca retorna negativo.
 */
export function liquidoEntregador(
  taxaEntrega: number | string | null | undefined,
  lojaTaxaPorPedido: number | string | null | undefined,
  planoMensalAtivo?: boolean | null,
): number {
  const taxa = Number(taxaEntrega);
  if (!Number.isFinite(taxa) || taxa <= 0) return 0;
  if (planoMensalAtivo) return taxa;
  const desconto = Number(lojaTaxaPorPedido);
  const d = Number.isFinite(desconto) && desconto > 0 ? desconto : 0;
  return Math.max(0, taxa - d);
}
