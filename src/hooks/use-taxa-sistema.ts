/**
 * Valor líquido que o entregador recebe por uma entrega.
 *
 * Modelo atual: o cliente paga o total (taxa global de entrega + taxa do
 * plano por pedido). O entregador recebe apenas a **taxa global (frete)** —
 * ou seja, `taxa_entrega - loja_taxa_por_pedido`. A taxa do plano fica
 * acumulada para a loja repassar ao sistema depois.
 *
 * O parâmetro `_planoMensalAtivo` é mantido por compatibilidade com
 * chamadas antigas e é ignorado.
 */
export function liquidoEntregador(
  taxaEntrega: number | string | null | undefined,
  lojaTaxaPorPedido?: number | string | null,
  _planoMensalAtivo?: boolean | null,
): number {
  const taxa = Number(taxaEntrega);
  if (!Number.isFinite(taxa) || taxa <= 0) return 0;
  const taxaPlano = Number(lojaTaxaPorPedido);
  const desconto = Number.isFinite(taxaPlano) && taxaPlano > 0 ? taxaPlano : 0;
  const liquido = taxa - desconto;
  return liquido > 0 ? Number(liquido.toFixed(2)) : 0;
}
