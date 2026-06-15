import { ROLE_OPTIONS, type Role } from "../logic/roles";

export function RoleSelector({ onPick }: { onPick: (role: Role) => void }) {
  return (
    <div className="space-y-4">
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">
        Quero me cadastrar como
      </div>
      <div className="grid grid-cols-1 gap-3">
        {ROLE_OPTIONS.map(({ value, label, Icon, desc }) => (
          <button
            key={value}
            type="button"
            onClick={() => onPick(value)}
            className="flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/60 hover:bg-primary/5 transition-all text-left group"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="font-display text-base font-bold tracking-wide">{label}</div>
              <div className="text-sm text-muted-foreground">{desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  const opt = ROLE_OPTIONS.find((o) => o.value === role);
  if (!opt) return null;
  const { Icon, label, desc } = opt;
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background/40">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <div className="font-display text-sm font-bold tracking-wide">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}
