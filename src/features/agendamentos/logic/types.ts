export type EntregadorAceito = {
  full_name: string | null;
  avatar_url: string | null;
  aceito_em: string;
};

export type TurnoRow = {
  id: string;
  loja_id: string;
  entregador_id: string | null;
  data_turno: string;
  hora_inicio: string;
  duracao_horas: number;
  valor_por_hora: number;
  taxa_por_entrega: number;
  observacoes: string | null;
  status: "rascunho" | "publicado" | "aceito" | "concluido" | "cancelado";
  publicado_em: string | null;
  aceito_em: string | null;
  created_at: string;
  vagas_total: number;
  vagas_preenchidas: number;
  aceites: EntregadorAceito[];
};
