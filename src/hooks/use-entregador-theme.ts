import { useEffect, useState, useCallback } from "react";

export type EntregadorTheme = "dark" | "light";
const STORAGE_KEY = "entregador-theme";
const EVENT = "entregador-theme-change";

function readInitial(): EntregadorTheme {
  if (typeof window === "undefined") return "dark";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "light" ? "light" : "dark";
}

export function useEntregadorTheme() {
  const [theme, setThemeState] = useState<EntregadorTheme>(readInitial);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<EntregadorTheme>).detail;
      if (detail === "light" || detail === "dark") setThemeState(detail);
    };
    window.addEventListener(EVENT, handler as EventListener);
    return () => window.removeEventListener(EVENT, handler as EventListener);
  }, []);

  const setTheme = useCallback((t: EntregadorTheme) => {
    setThemeState(t);
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {}
    window.dispatchEvent(new CustomEvent(EVENT, { detail: t }));
  }, []);

  const toggle = useCallback(
    () => setTheme(theme === "light" ? "dark" : "light"),
    [theme, setTheme]
  );

  return { theme, setTheme, toggle };
}
