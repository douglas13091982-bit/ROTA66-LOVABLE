export const pageWrapper =
  "catalogo-clean min-h-screen bg-background pb-[calc(env(safe-area-inset-bottom)+6rem)]";

export type AdicionalOpcao = {
  id: string;
  nome: string;
  preco: number;
  ativo: boolean;
  ordem: number;
};

export type AdicionalGrupo = {
  id: string;
  nome: string;
  obrigatorio: boolean;
  min_escolhas: number;
  max_escolhas: number;
  ordem: number;
  opcoes: AdicionalOpcao[];
};

export type Produto = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  preco_promocional?: number | null;
  imagem_url: string | null;
  categoria: string | null;
  adicionais_grupos?: AdicionalGrupo[];
};

export function precoEfetivo(p: { preco: number | string; preco_promocional?: number | string | null }): number {
  const promo = p.preco_promocional != null ? Number(p.preco_promocional) : null;
  if (promo != null && !isNaN(promo) && promo > 0) return promo;
  return Number(p.preco) || 0;
}
