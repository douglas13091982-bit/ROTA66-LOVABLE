export type TicketStatus = "aberto" | "respondido" | "fechado";
export type TicketPrioridade = "normal" | "alta";
export type AutorTipo = "loja" | "admin";

export type Ticket = {
  id: string;
  loja_id: string;
  loja_nome?: string | null;
  assunto: string;
  status: TicketStatus;
  prioridade: TicketPrioridade;
  ultima_mensagem_em: string;
  nao_lidas_loja: number;
  nao_lidas_admin: number;
  created_at: string;
};

export type Mensagem = {
  id: string;
  ticket_id: string;
  autor_id: string;
  autor_tipo: AutorTipo;
  mensagem: string;
  created_at: string;
};

export type Modo = "loja" | "admin";
