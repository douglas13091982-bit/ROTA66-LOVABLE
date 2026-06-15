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
  lojas?: { nome?: string | null } | null;
  [key: string]: any;
};
