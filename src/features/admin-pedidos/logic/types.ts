export type PedidoRow = {
  id: string;
  numero: number;
  cliente_nome: string;
  valor_total: number;
  entregador_id: string | null;
  status: string;
  created_at: string;
  lojas?: { nome: string; slug: string } | null;
};
