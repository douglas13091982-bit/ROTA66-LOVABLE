/**
 * Ganho líquido do entregador por pedido.
 *
 * Regra padrão (pool): cliente paga frete_global + taxa_por_pedido da loja;
 * o entregador recebe apenas o frete_global (dobrado quando é cartão).
 *
 * Regra de TURNO AGENDADO: quando o pedido foi atribuído automaticamente por
 * um turno da loja (`agendamento_id` preenchido), o entregador recebe a
 * `taxa_por_entrega` combinada no turno (snapshot em `taxa_turno_entregador`).
 * As horas do turno são pagas separadamente na conclusão do turno.
 *
 * Mantém paridade com o trigger `processar_saldos_pedido_entregue` no banco.
 */
import { liquidoEntregador } from "@/hooks/use-taxa-sistema";

export type PedidoGanhoInput = {
  taxa_entrega?: number | string | null;
  loja_taxa_por_pedido?: number | string | null;
  loja_plano_mensal_ativo?: boolean | null;
  forma_pagamento?: string | null;
  agendamento_id?: string | null;
  taxa_turno_entregador?: number | string | null;
};

/** Retorna o líquido do pedido SEM bônus (o bônus é somado por quem exibe). */
export function ganhoPedidoEntregador(p: PedidoGanhoInput): number {
  if (p.agendamento_id) {
    const taxaTurno = Number(p.taxa_turno_entregador ?? 0) || 0;
    return Number(Math.max(0, taxaTurno).toFixed(2));
  }
  return liquidoEntregador(
    p.taxa_entrega,
    Number(p.loja_taxa_por_pedido ?? 0),
    p.loja_plano_mensal_ativo,
    p.forma_pagamento,
  );
}
