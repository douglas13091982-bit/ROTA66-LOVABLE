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
  preco_promocional_ate?: string | null;
  imagem_url: string | null;
  categoria: string | null;
  adicionais_grupos?: AdicionalGrupo[];
};

export function promoAtiva(p: {
  preco_promocional?: number | string | null;
  preco_promocional_ate?: string | null;
}): boolean {
  const promo = p.preco_promocional != null ? Number(p.preco_promocional) : null;
  if (!promo || isNaN(promo) || promo <= 0) return false;
  if (!p.preco_promocional_ate) return true;
  return new Date(p.preco_promocional_ate).getTime() > Date.now();
}

export function precoEfetivo(p: {
  preco: number | string;
  preco_promocional?: number | string | null;
  preco_promocional_ate?: string | null;
}): number {
  if (promoAtiva(p)) return Number(p.preco_promocional);
  return Number(p.preco) || 0;
}
