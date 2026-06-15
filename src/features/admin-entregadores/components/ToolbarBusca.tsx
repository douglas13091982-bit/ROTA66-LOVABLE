import { LayoutGrid, List, Search } from "lucide-react";

export type ViewMode = "card" | "list";

export function ToolbarBusca({
  search,
  onSearchChange,
  view,
  onViewChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por nome, telefone, email…"
          className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div className="inline-flex rounded-md border border-border overflow-hidden self-start">
        <button
          onClick={() => onViewChange("card")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider transition ${
            view === "card"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          <LayoutGrid className="h-3.5 w-3.5" /> Cards
        </button>
        <button
          onClick={() => onViewChange("list")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider transition border-l border-border ${
            view === "list"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          <List className="h-3.5 w-3.5" /> Lista
        </button>
      </div>
    </div>
  );
}
