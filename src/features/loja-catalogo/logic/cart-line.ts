export type AdicionalEscolhido = {
  grupo_id: string;
  grupo_nome: string;
  opcao_id: string;
  nome: string;
  preco: number;
};

export function lineIdFor(produtoId: string, adicionais: AdicionalEscolhido[]): string {
  if (!adicionais || adicionais.length === 0) return produtoId;
  const key = adicionais
    .map((a) => a.opcao_id)
    .sort()
    .join(",");
  return `${produtoId}::${key}`;
}
