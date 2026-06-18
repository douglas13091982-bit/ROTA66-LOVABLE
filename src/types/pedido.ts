/**
 * Tipos compartilhados do domínio Pedido.
 * Os campos refletem as colunas reais da tabela `pedidos`.
 */

export type PedidoDisponivel = {
  id: string;
  numero: number;
  loja_id: string;
  status: string;
  entregador_id: string | null;
  rota_id: string | null;
  rota_ordem: number | null;
  created_at: string;

  endereco_coleta: string | null;
  endereco_entrega: string | null;
  endereco_coleta_lat: number | string | null;
  endereco_coleta_lng: number | string | null;
  endereco_entrega_lat: number | string | null;
  endereco_entrega_lng: number | string | null;

  taxa_entrega: number | string | null;
  bonus_entregador: number | string | null;
  codigo_coleta: string | null;
  forma_pagamento?: string | null;

  /** Nome da loja (vindo de join ou RPC). */
  loja_nome?: string | null;

  /** Bairro da loja (vindo de join ou RPC). */
  loja_bairro?: string | null;

  /** Se true, a loja tem plano mensal ativo (entregador recebe valor cheio). */
  loja_plano_mensal_ativo?: boolean | null;

  /** Taxa por pedido da loja (vem do plano vinculado). Descontada do entregador. */
  loja_taxa_por_pedido?: number | string | null;

  /** Definido pela RPC `pedidos_pool_externo` em pedidos externos. */
  oferta_expira_em?: string | null;
  /** Flag local: pedido vindo do pool externo (não dos vínculos). */
  _externo: boolean;
};

export type GrupoPedido = {
  key: string;
  items: PedidoDisponivel[];
  isRota: boolean;
};

export type TarifaFaixa = {
  faixa_km_min: number | string;
  faixa_km_max: number | string;
  valor: number | string;
  valor_minimo: number | string | null;
  valor_por_km: number | string | null;
};
