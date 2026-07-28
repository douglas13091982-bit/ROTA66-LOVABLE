import { LayoutGrid, List, Search } from "lucide-react";

export type ViewMode = "card" | "list";

export function ViewToggle({
  view,
  onViewChange,
}: {
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-white/10 overflow-hidden bg-white/[0.03] self-start">
      <button
        onClick={() => onViewChange("card")}
        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
          view === "card"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <LayoutGrid className="h-4 w-4" /> Cards
      </button>
      <button
        onClick={() => onViewChange("list")}
        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition border-l border-white/10 ${
          view === "list"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <List className="h-4 w-4" /> Lista
      </button>
    </div>
  );
}

export function ToolbarBusca({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
}) {
  return (
    <div className="relative flex-1 min-w-0">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Buscar por nome, telefone, email..."
        className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:border-white/25"
      />
    </div>
  );
}
