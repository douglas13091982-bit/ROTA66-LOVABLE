import { Check, X } from "lucide-react";
import { passwordStrength } from "../logic/password-rules";

export function PasswordRequirements({ password }: { password: string }) {
  const { results, passed, pct, label, color } = passwordStrength(password);

  return (
    <div className="-mt-3 mb-5 rounded-lg border border-border/60 bg-background/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Força da senha</span>
        <span className={`text-[11px] font-bold ${passed >= 4 ? "text-emerald-400" : "text-muted-foreground"}`}>
          {label}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-border/40 overflow-hidden mb-3">
        <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
      <ul className="space-y-1.5">
        {results.map((r) => (
          <li
            key={r.key}
            className={`flex items-center gap-2 text-xs transition-colors duration-200 ${
              r.ok ? "text-emerald-400" : "text-muted-foreground"
            }`}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                r.ok ? "border-emerald-400/60 bg-emerald-400/15" : "border-border/70 bg-background/40"
              }`}
            >
              {r.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 opacity-50" />}
            </span>
            <span>{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
