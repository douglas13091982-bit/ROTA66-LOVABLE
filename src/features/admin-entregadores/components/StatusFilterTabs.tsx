import { STATUS_LABEL, type StatusFilter } from "../logic/types";

export function StatusFilterTabs({
  filter,
  counts,
  onChange,
}: {
  filter: StatusFilter;
  counts?: Record<StatusFilter, number>;
  onChange: (s: StatusFilter) => void;
}) {
  const opts: StatusFilter[] = ["todas", "pendente", "aprovado", "bloqueado"];
  return (
    <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
      {opts.map((s, i) => {
        const active = filter === s;
        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-xs font-bold uppercase tracking-wider transition ${
              i > 0 ? "border-l border-white/10" : ""
            } ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {s === "todas" ? "Todos" : STATUS_LABEL[s].label}
            {counts && (
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums ${
                  active ? "bg-black/20" : "bg-white/[0.06] text-foreground"
                }`}
              >
                {counts[s] ?? 0}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
