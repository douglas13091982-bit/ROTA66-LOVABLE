export type Socio = {
  id: string;
  franqueado_user_id: string;
  nome: string;
  percentual: number;
  ordem: number;
};

export type Despesa = {
  id: string;
  franqueado_user_id: string;
  descricao: string;
  categoria: string | null;
  tipo: "despesa" | "investimento";
  valor: number;
  competencia: string; // YYYY-MM
  pago: boolean;
  observacao: string | null;
  created_at: string;
  recorrente: boolean;
  recorrencia_id: string | null;
};

export type DespesaForm = {
  descricao: string;
  categoria: string;
  tipo: "despesa" | "investimento";
  valor: string;
  observacao: string;
  recorrente: boolean;
  meses: string;
};

export const FORM_INICIAL: DespesaForm = {
  descricao: "",
  categoria: "",
  tipo: "despesa",
  valor: "",
  observacao: "",
  recorrente: false,
  meses: "12",
};
