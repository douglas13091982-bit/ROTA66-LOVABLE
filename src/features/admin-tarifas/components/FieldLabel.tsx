import { ReactNode } from "react";

export function FieldLabel({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="text-[10px] text-muted-foreground leading-tight">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "bg-background border border-border rounded-md px-3 py-2.5 focus:outline-none focus:border-primary";
