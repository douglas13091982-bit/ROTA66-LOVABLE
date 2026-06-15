import { Search, LayoutGrid, List } from "lucide-react";
import { FILTER_OPTIONS, STATUS_LABEL, type StatusFilter } from "../logic/constants";

interface Props {
  search: string;
  onSearch: (v: string) => void;
  view: "card" | "list";
  onView: (v: "card" | "list") => void;
  filter: StatusFilter;
  onFilter: (f: StatusFilter) => void;
}

export function LojasToolbar({
  search,
  onSearch,
  view,
  onView,
  filter,
  onFilter,
}: Props) {
  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar por nome, CNPJ, cidade, telefone, email…"
            className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="inline-flex rounded-md border border-border overflow-hidden self-start">
          <ViewToggle
            active={view === "card"}
            onClick={() => onView("card")}
            label="Cards"
            icon={<LayoutGrid className="h-3.5 w-3.5" />}
          />
          <ViewToggle
            active={view === "list"}
            onClick={() => onView("list")}
            label="Lista"
            icon={<List className="h-3.5 w-3.5" />}
            divider
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {FILTER_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onFilter(s)}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition ${
              filter === s
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground border border-border hover:text-foreground"
            }`}
          >
            {s === "todas" ? "Todas" : STATUS_LABEL[s].label}
          </button>
        ))}
      </div>
    </>
  );
}

function ViewToggle({
  active,
  onClick,
  label,
  icon,
  divider,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  divider?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider transition ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-card text-muted-foreground hover:text-foreground"
      } ${divider ? "border-l border-border" : ""}`}
    >
      {icon} {label}
    </button>
  );
}
