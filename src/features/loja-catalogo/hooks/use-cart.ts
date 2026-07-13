import { useMemo, useState } from "react";
import type { Produto } from "@/routes/-catalogo-types";
import { lineIdFor, type AdicionalEscolhido } from "../logic/cart-line";

export type CartLine = {
  lineId: string;
  produto_id: string;
  adicionais: AdicionalEscolhido[];
  qtd: number;
};

export type CartItem = {
  lineId: string;
  produto: Produto;
  adicionais: AdicionalEscolhido[];
  qtd: number;
  precoUnit: number;
};

export function useCart(produtos: Produto[] | undefined) {
  const [cart, setCart] = useState<Record<string, CartLine>>({});

  const produtosMap = useMemo(
    () => new Map((produtos ?? []).map((p) => [p.id, p])),
    [produtos],
  );

  const cartItems: CartItem[] = Object.values(cart)
    .map((line) => {
      const produto = produtosMap.get(line.produto_id);
      if (!produto) return null;
      const precoUnit =
        Number(produto.preco) + line.adicionais.reduce((s, a) => s + Number(a.preco), 0);
      return { lineId: line.lineId, produto, adicionais: line.adicionais, qtd: line.qtd, precoUnit };
    })
    .filter(Boolean) as CartItem[];

  const subtotal = cartItems.reduce((s, i) => s + i.precoUnit * i.qtd, 0);
  const totalItens = cartItems.reduce((s, i) => s + i.qtd, 0);

  const qtdByProduto = useMemo(() => {
    const m: Record<string, number> = {};
    for (const line of Object.values(cart)) {
      m[line.produto_id] = (m[line.produto_id] ?? 0) + line.qtd;
    }
    return m;
  }, [cart]);

  function addLine(produtoId: string, adicionais: AdicionalEscolhido[] = [], qtd = 1) {
    const lineId = lineIdFor(produtoId, adicionais);
    setCart((c) => {
      const existing = c[lineId];
      return {
        ...c,
        [lineId]: existing
          ? { ...existing, qtd: existing.qtd + qtd }
          : { lineId, produto_id: produtoId, adicionais, qtd },
      };
    });
  }

  function changeQty(lineId: string, delta: number) {
    setCart((c) => {
      const line = c[lineId];
      if (!line) return c;
      const next = { ...c };
      const q = line.qtd + delta;
      if (q <= 0) delete next[lineId];
      else next[lineId] = { ...line, qtd: q };
      return next;
    });
  }

  function removeLine(lineId: string) {
    setCart((c) => {
      const n = { ...c };
      delete n[lineId];
      return n;
    });
  }

  // Compatibilidade: produtos sem adicionais são representados pela lineId === produto_id.
  function addItem(produtoId: string) {
    addLine(produtoId, []);
  }
  function removeItem(produtoId: string) {
    changeQty(produtoId, -1);
  }

  function clear() {
    setCart({});
  }

  return {
    cart,
    setCart,
    addItem,
    removeItem,
    addLine,
    changeQty,
    removeLine,
    clear,
    cartItems,
    subtotal,
    totalItens,
    qtdByProduto,
  };
}

export type CartApi = ReturnType<typeof useCart>;
