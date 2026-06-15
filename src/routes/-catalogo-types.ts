export const pageWrapper =
  "catalogo-clean min-h-screen bg-background pb-[calc(env(safe-area-inset-bottom)+6rem)]";

export type Produto = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  imagem_url: string | null;
  categoria: string | null;
};
