import { useCallback, useEffect } from "react";

export type Theme = "dark";

// Tema light foi removido. Mantemos o hook apenas por compatibilidade
// para componentes que ainda importam `useTheme`.
export function useTheme() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.remove("light");
    try {
      window.localStorage.removeItem("rota-theme");
    } catch {}
  }, []);

  const noop = useCallback(() => {}, []);
  return { theme: "dark" as Theme, setTheme: noop, toggle: noop };
}
