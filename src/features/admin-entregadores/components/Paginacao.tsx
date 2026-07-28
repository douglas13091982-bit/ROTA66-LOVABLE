import { ChevronLeft, ChevronRight } from "lucide-react";

export function Paginacao({
  page,
  totalPages,
  total,
  from,
  to,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  onChange: (p: number) => void;
}) {
  if (total === 0) return null;

  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== "...") pages.push("...");
  }

  const btn =
    "h-10 min-w-10 px-3 inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-sm text-muted-foreground hover:text-foreground disabled:opacity-40";

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mt-8 pt-5 border-t border-white/5">
      <div className="text-xs text-muted-foreground">
        Mostrando {from} a {to} de {total} entregadores
      </div>
      <div className="flex items-center gap-2">
        <button className={btn} disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`e${i}`} className="px-1 text-muted-foreground text-sm">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={
                p === page
                  ? "h-10 min-w-10 px-3 inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold"
                  : btn
              }
            >
              {p}
            </button>
          )
        )}
        <button className={btn} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
