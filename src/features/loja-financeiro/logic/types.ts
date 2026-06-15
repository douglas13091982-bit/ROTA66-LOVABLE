export type Cobranca = {
  id: string;
  pedido_id: string;
  valor: number;
  vencimento: string;
  pago: boolean;
  pago_em: string | null;
  created_at: string;
  pago_solicitado_em?: string | null;
};

export type Mensalidade = {
  id: string;
  competencia: string;
  valor: number;
  vencimento: string;
  pago: boolean;
  pago_em: string | null;
  created_at: string;
  pago_solicitado_em?: string | null;
};

export type PixCfg = {
  pix_chave_sistema: string | null;
  pix_titular_sistema: string | null;
  pix_cidade_sistema: string | null;
};

export type DialogState =
  | null
  | {
      tipo: "mensalidade" | "cobranca" | "agrupado-mensalidade" | "agrupado-cobranca";
      valor: number;
      ids: string[];
      titulo: string;
      descricao: string;
    };
