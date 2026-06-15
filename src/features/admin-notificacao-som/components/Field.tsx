import type { ReactNode } from "react";

export function Field({
  icon,
  label,
  hint,
  children,
}: {
  icon?: ReactNode;
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-sm font-bold">
        {icon}
        {label}
      </label>
      {children}
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function ToggleCard({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 p-3 bg-muted/40 border border-border rounded-md cursor-pointer">
      <div>
        <div className="font-bold text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 accent-primary"
      />
    </label>
  );
}
