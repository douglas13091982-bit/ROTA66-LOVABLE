import { LayoutGrid, List, Search } from "lucide-react";
import type { ViewMode } from "../logic/types";

export function ProdutosToolbar({
  search,
  onSearch,
  view,
  onViewChange,
}: {
  search: string;
  onSearch: (v: string) => void;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
}) {
  const btn = (v: ViewMode, Icon: typeof LayoutGrid, label: string, extra = "") => (
    <button
      type="button"
      onClick={() => onViewChange(v)}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${extra} ${
        view === v
          ? "bg-primary text-primary-foreground"
          : "bg-background text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="relative flex items-center">
        <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar produto..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-8 pr-3 py-1.5 bg-background border border-border rounded-md text-sm w-64"
        />
      </div>
      <div className="inline-flex rounded-md border border-border overflow-hidden">
        {btn("cards", LayoutGrid, "Cards")}
        {btn("lista", List, "Lista", "border-l border-border")}
      </div>
    </div>
  );
}
