import { useState } from "react";
import { VIEW_STORAGE_KEY, type ViewMode } from "../logic/types";

export function useViewMode() {
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "cards";
    return (localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode) || "cards";
  });
  function setViewPersist(v: ViewMode) {
    setView(v);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, v);
    } catch {
      /* noop */
    }
  }
  return { view, setView: setViewPersist };
}
