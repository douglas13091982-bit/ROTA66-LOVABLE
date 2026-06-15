export type TabKey = "config" | "entregadores" | "transacoes";

export type ConfigCreditos = {
  ativo: boolean;
  mensalidade_valor: number | string;
  dia_vencimento: number | string;
  saldo_minimo: number | string;
  mp_configurado?: boolean;
  mp_access_token_masked?: string | null;
  mp_public_key?: string | null;
  _mp_access_token_novo?: string;
};

export type EntregadorCreditoRow = {
  entregador_id: string;
  full_name: string | null;
  phone: string | null;
  status_conta: string;
  saldo: number | string;
  ultima_competencia_cobrada: string | null;
};

export type TransacaoRow = {
  id: string;
  entregador_id: string;
  tipo: "recarga" | "mensalidade" | "ajuste_manual" | "estorno" | string;
  valor: number | string;
  saldo_apos: number | string;
  descricao: string | null;
  created_at: string;
};

export const TIPO_CLS: Record<string, string> = {
  recarga: "text-green-400",
  mensalidade: "text-amber-400",
  ajuste_manual: "text-blue-400",
  estorno: "text-purple-400",
};
