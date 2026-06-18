/**
 * Valor líquido que o entregador recebe por uma entrega.
 *
 * Modelo atual: a taxa do plano é cobrada do CLIENTE (somada à tarifa de
 * entrega), não descontada do entregador. Portanto o entregador recebe
 * `taxa_entrega` integral. Os parâmetros adicionais (`_lojaTaxaPorPedido`,
 * `_planoMensalAtivo`) são aceitos por compatibilidade com chamadas antigas
 * mas são ignorados.
 */
export function liquidoEntregador(
  taxaEntrega: number | string | null | undefined,
  _lojaTaxaPorPedido?: number | string | null,
  _planoMensalAtivo?: boolean | null,
): number {
  const taxa = Number(taxaEntrega);
  if (!Number.isFinite(taxa) || taxa <= 0) return 0;
  return taxa;
}
