export type PlanoRow = {
  id: string;
  nome: string;
  descricao: string | null;
  mensalidade_valor: number;
  taxa_por_pedido: number;
  dia_vencimento: number;
  destaque: boolean;
  ordem: number;
  ativo: boolean;
  max_funcionarios: number;
  max_pedidos_mes: number;
  created_at?: string;
  updated_at?: string;
};

export type PlanoFormState = {
  nome: string;
  descricao: string;
  mensalidade_valor: string;
  taxa_por_pedido: string;
  dia_vencimento: string;
  destaque: boolean;
  ordem: string;
  ativo: boolean;
  max_funcionarios: string;
  max_pedidos_mes: string;
};

export const INITIAL_PLANO_FORM: PlanoFormState = {
  nome: "",
  descricao: "",
  mensalidade_valor: "0",
  taxa_por_pedido: "0",
  dia_vencimento: "10",
  destaque: false,
  ordem: "0",
  ativo: true,
  max_funcionarios: "0",
};
