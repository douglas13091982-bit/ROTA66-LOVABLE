/**
 * Valor líquido que o entregador recebe por uma entrega.
 *
 * Modelo atual: o entregador recebe a **taxa global (frete)** integral.
 * A taxa do plano por pedido fica como cobrança da loja para o sistema e
 * NÃO deve ser abatida do valor exibido/creditado ao entregador.
 *
 * O parâmetro `_planoMensalAtivo` é mantido por compatibilidade com
 * chamadas antigas e é ignorado.
 */
export function liquidoEntregador(
  taxaEntrega: number | string | null | undefined,
  _lojaTaxaPorPedido?: number | string | null,
  _planoMensalAtivo?: boolean | null,
): number {
  const taxa = Number(taxaEntrega);
  if (!Number.isFinite(taxa) || taxa <= 0) return 0;
  return Number(taxa.toFixed(2));
}
