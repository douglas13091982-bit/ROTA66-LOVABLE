import type { Produto } from "./types";

export function filterProdutos(produtos: Produto[], search: string): Produto[] {
  const q = search.trim().toLowerCase();
  if (!q) return produtos;
  return produtos.filter(
    (p) =>
      p.nome.toLowerCase().includes(q) ||
      (p.categoria ?? "").toLowerCase().includes(q) ||
      (p.descricao ?? "").toLowerCase().includes(q),
  );
}
