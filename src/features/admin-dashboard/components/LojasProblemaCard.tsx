import { AlertTriangle, ChevronRight, Store } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useLojasProblema } from "../hooks/use-lojas-problema";

export function LojasProblemaCard() {
  const { data, isLoading } = useLojasProblema();

  const lojas = data ?? [];
  const total = lojas.length;
  const top = lojas.slice(0, 5);

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-destructive/10 p-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Lojas com problema</h3>
            <p className="text-xs text-muted-foreground">
              Saldo negativo, mensalidade atrasada ou inativas
            </p>
          </div>
        </div>
        {total > 0 && (
          <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
            {total}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-4 text-center">
          Carregando…
        </div>
      ) : total === 0 ? (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          <Store className="h-4 w-4" />
          Todas as lojas estão em dia. 🎉
        </div>
      ) : (
        <ul className="space-y-2">
          {top.map((loja) => (
            <li key={loja.id}>
              <Link
                to="/admin/lojas"
                className="flex items-start justify-between gap-3 rounded-lg border border-border/60 p-3 hover:bg-muted/50 transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-foreground truncate">
                    {loja.nome}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {loja.problemas.map((p, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-md bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />
              </Link>
            </li>
          ))}
          {total > top.length && (
            <li className="pt-1">
              <Link
                to="/admin/lojas"
                className="text-xs font-medium text-primary hover:underline"
              >
                Ver todas ({total}) →
              </Link>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
