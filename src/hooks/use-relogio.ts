import { useEffect, useState } from "react";

/** Re-renderiza periodicamente para atualizar contadores regressivos. */
export function useRelogio(intervaloMs = 1000): number {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs]);
  return nowMs;
}
