export type Produto = {
  id: string;
  loja_id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  imagem_url: string | null;
  imagem_signed_url?: string | null;
  categoria: string | null;
  ativo: boolean;
  ordem: number;
};

export type ViewMode = "cards" | "lista";

export const VIEW_STORAGE_KEY = "loja:produtos:view";
