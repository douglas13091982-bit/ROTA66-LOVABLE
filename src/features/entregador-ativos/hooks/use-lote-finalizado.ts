import { useEffect, useRef, useState } from "react";
import type { PedidoAtivo } from "../logic/types";

/**
 * Rastreia o lote ativo. Quando o lote zera, congela seus IDs como "finalizados"
 * para que possamos mostrar o resumo apenas dessas entregas.
 */
export function useLoteFinalizado(pedidos: PedidoAtivo[] | undefined) {
  const loteAtivoRef = useRef<string[]>([]);
  const [loteFinalizado, setLoteFinalizado] = useState<string[]>([]);
  const [dismissedFinalizado, setDismissedFinalizado] = useState(false);

  useEffect(() => {
    if (!pedidos) return;
    if (pedidos.length > 0) {
      const novos = pedidos.map((p) => p.id);
      loteAtivoRef.current = Array.from(new Set([...loteAtivoRef.current, ...novos]));
      setDismissedFinalizado(false);
      setLoteFinalizado([]);
    } else if (loteAtivoRef.current.length > 0) {
      setLoteFinalizado(loteAtivoRef.current);
      loteAtivoRef.current = [];
    }
  }, [pedidos]);

  return { loteFinalizado, dismissedFinalizado, dismissFinalizado: () => setDismissedFinalizado(true) };
}
