export type SaldoEntregador = {
  bloqueado?: boolean;
  mensalidade_paga?: boolean;
  mensalidade_valor?: number | string | null;
  data_vencimento_atual?: string | null;
  dia_vencimento?: number | null;
} | null;

export type ConfigCreditos = {
  mp_configurado?: boolean;
  ativo?: boolean;
} | null;

export type TransacaoCredito = {
  id: string;
  tipo: string;
  valor: number | string;
  saldo_apos: number | string;
  descricao: string | null;
  created_at: string;
};

export type RecargaPixState = {
  recargaId: string;
  qrCode: string | null;
  qrCodeBase64: string | null;
  valor: number;
  status: string;
};
