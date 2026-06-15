export type TurnoDisponivel = {
  agendamento_id: string;
  loja_id: string;
  loja_nome: string | null;
  data_turno: string;
  hora_inicio: string;
  duracao_horas: number;
  valor_por_hora: number;
  taxa_por_entrega: number;
  observacoes: string | null;
  expira_em: string;
  vagas_total: number;
  vagas_preenchidas: number;
};

export type MeuTurnoRow = {
  id: string;
  loja_id: string;
  data_turno: string;
  hora_inicio: string;
  duracao_horas: number;
  valor_por_hora: number;
  taxa_por_entrega: number;
  observacoes: string | null;
  status: string;
  vagas_total: number;
  vagas_preenchidas: number;
  loja_nome: string | null;
  loja_endereco: string | null;
  loja_endereco_lat: number | null;
  loja_endereco_lng: number | null;
  loja_telefone: string | null;
};

export type MeuTurno = {
  id: string;
  loja_id: string;
  data_turno: string;
  hora_inicio: string;
  duracao_horas: number;
  valor_por_hora: number;
  taxa_por_entrega: number;
  observacoes: string | null;
  status: string;
  vagas_total: number;
  vagas_preenchidas: number;
  lojas: {
    nome: string | null;
    endereco: string | null;
    endereco_lat: number | null;
    endereco_lng: number | null;
    telefone: string | null;
  } | null;
};
