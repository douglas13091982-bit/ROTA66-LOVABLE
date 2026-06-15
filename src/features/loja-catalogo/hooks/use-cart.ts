import { useMemo, useState } from "react";
import type { Produto } from "@/routes/-catalogo-types";

export function useCart(produtos: Produto[] | undefined) {
  const [cart, setCart] = useState<Record<string, number>>({});

  const produtosMap = useMemo(
    () => new Map((produtos ?? []).map((p) => [p.id, p])),
    [produtos],
  );

  const cartItems = Object.entries(cart)
    .map(([id, qtd]) => ({ produto: produtosMap.get(id)!, qtd }))
    .filter((i) => i.produto);

  const subtotal = cartItems.reduce((s, i) => s + i.produto.preco * i.qtd, 0);
  const totalItens = Object.values(cart).reduce((s, n) => s + n, 0);

  function addItem(id: string) {
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  }
  function removeItem(id: string) {
    setCart((c) => {
      const q = (c[id] ?? 0) - 1;
      const n = { ...c };
      if (q <= 0) delete n[id];
      else n[id] = q;
      return n;
    });
  }
  function clear() {
    setCart({});
  }

  return { cart, setCart, addItem, removeItem, clear, cartItems, subtotal, totalItens };
}

export type CartApi = ReturnType<typeof useCart>;
