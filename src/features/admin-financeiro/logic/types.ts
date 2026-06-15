export type Cobranca = {
  id: string;
  loja_id: string;
  pedido_id: string;
  valor: number;
  vencimento: string;
  pago: boolean;
  pago_em: string | null;
  created_at: string;
  loja_nome?: string;
  pago_solicitado_em?: string | null;
};

export type Mensalidade = {
  id: string;
  loja_id: string;
  competencia: string;
  valor: number;
  vencimento: string;
  pago: boolean;
  pago_em: string | null;
  loja_nome?: string;
  pago_solicitado_em?: string | null;
};

export type ConfigFinanceiro = {
  taxa: number;
  prazo: number;
  mensalidadePadrao: number;
  diaVenc: number;
  pixChave: string;
  pixTitular: string;
  pixCidade: string;
};
