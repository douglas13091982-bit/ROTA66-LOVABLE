export type Periodo = "semanal" | "mensal";

export type Bucket = {
  key: string;
  label: string;
  valor: number;
  ts: number;
};

export type PedidoHistorico = {
  id: string;
  numero: number | string;
  updated_at: string;
  taxa_entrega: number;
  cliente_nome?: string | null;
  lojas?: {
    nome?: string | null;
    plano_mensal_ativo?: boolean | null;
    taxa_por_pedido?: number | string | null;
  } | null;
  loja_plano_mensal_ativo?: boolean | null;
  loja_taxa_por_pedido?: number | string | null;
  [key: string]: any;
};
