import { STATUS_LABEL, type StatusFilter } from "../logic/types";

export function StatusFilterTabs({
  filter,
  onChange,
}: {
  filter: StatusFilter;
  onChange: (s: StatusFilter) => void;
}) {
  const opts: StatusFilter[] = ["todas", "pendente", "aprovado", "bloqueado"];
  return (
    <div className="flex flex-wrap gap-2 mb-5">
      {opts.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition ${
            filter === s
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground border border-border hover:text-foreground"
          }`}
        >
          {s === "todas" ? "Todos" : STATUS_LABEL[s].label}
        </button>
      ))}
    </div>
  );
}
