import { useCallback, useEffect, useState } from "react";

export type OrdenacaoPedidos = "proximos" | "valor";

const KEY = "entregador:ordenacao-pedidos";

function load(): OrdenacaoPedidos {
  try {
    const v = localStorage.getItem(KEY);
    return v === "valor" ? "valor" : "proximos";
  } catch {
    return "proximos";
  }
}

export function useOrdenacaoPedidos() {
  const [ordenacao, setOrdenacaoState] = useState<OrdenacaoPedidos>("proximos");

  useEffect(() => {
    setOrdenacaoState(load());
  }, []);

  const setOrdenacao = useCallback((v: OrdenacaoPedidos) => {
    setOrdenacaoState(v);
    try {
      localStorage.setItem(KEY, v);
    } catch {}
  }, []);

  return { ordenacao, setOrdenacao };
}
