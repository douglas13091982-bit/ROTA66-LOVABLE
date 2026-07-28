/**
 * Regra única para saber se uma loja está em "plano mensal".
 *
 * ATENÇÃO: `plano_mensal_ativo` só fica true quando `taxa_por_pedido = 0`.
 * Planos híbridos (mensalidade + taxa por pedido, ex.: "Pro") também são
 * plano mensal e devem liberar os mesmos recursos (turnos, vincular
 * entregadores etc.). Sempre use este helper — nunca leia
 * `plano_mensal_ativo` direto para liberar/bloquear recursos.
 */
export type LojaPlanoInput = {
  plano_mensal_ativo?: boolean | null;
  mensalidade_valor?: number | string | null;
  plano_id?: string | null;
} | null | undefined;

export function temPlanoMensal(loja: LojaPlanoInput): boolean {
  if (!loja) return false;
  if (loja.plano_mensal_ativo) return true;
  if (loja.plano_id) return true;
  return Number(loja.mensalidade_valor ?? 0) > 0;
}
