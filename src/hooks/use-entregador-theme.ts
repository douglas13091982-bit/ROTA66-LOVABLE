import { useEffect, useState, useCallback } from "react";

export type EntregadorTheme = "dark" | "light";
const STORAGE_KEY = "entregador-theme";

function readInitial(): EntregadorTheme {
  if (typeof window === "undefined") return "dark";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "light" ? "light" : "dark";
}

export function useEntregadorTheme() {
  const [theme, setThemeState] = useState<EntregadorTheme>(readInitial);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") root.classList.add("entregador-light");
    else root.classList.remove("entregador-light");
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
    return () => {
      // cleanup when component using this unmounts (leaving entregador area)
      root.classList.remove("entregador-light");
    };
  }, [theme]);

  const setTheme = useCallback((t: EntregadorTheme) => setThemeState(t), []);
  const toggle = useCallback(
    () => setThemeState((t) => (t === "light" ? "dark" : "light")),
    []
  );

  return { theme, setTheme, toggle };
}

export function getEntregadorTheme(): EntregadorTheme {
  return readInitial();
}
