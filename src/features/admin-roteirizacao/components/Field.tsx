import type { ReactNode } from "react";

export function Field({
  icon,
  label,
  hint,
  children,
}: {
  icon: ReactNode;
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

export const numberInputClass = "w-full px-3 py-2 bg-background border border-border rounded-md font-mono";
