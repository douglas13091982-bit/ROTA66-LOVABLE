import type { ReactNode } from "react";

export function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
        {required && <span className="text-primary"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
