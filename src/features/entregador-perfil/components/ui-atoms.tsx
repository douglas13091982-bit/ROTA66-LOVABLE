import type { ReactNode } from "react";

export function StatCell({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="text-center py-2">
      <div
        className="entregador-stat-value text-[26px] font-extrabold leading-none tracking-tight text-white"
        style={accent ? { color: "oklch(0.78 0.16 27)" } : undefined}
      >
        {value}
      </div>
      <div className="text-[11px] mt-1.5 text-white/55 font-mono">{label}</div>
    </div>
  );
}

export function SectionPanel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/[0.025] border border-white/8 p-4 space-y-3">
      {children}
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.22em] text-white/45 font-bold mb-1.5">
        {label}
      </label>
      <input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 disabled:text-white/40"
      />
    </div>
  );
}

export function SmallBtn({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-[11px] font-bold uppercase tracking-[0.16em] hover:bg-white/[0.08] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function PrimaryBtn({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full px-4 py-3 rounded-xl text-white text-[12px] font-bold uppercase tracking-[0.18em] disabled:opacity-50 active:scale-[0.98] transition-transform"
      style={{
        background: "linear-gradient(135deg, oklch(0.62 0.22 27), oklch(0.52 0.22 27))",
        boxShadow: "0 8px 22px -8px oklch(0.55 0.22 27 / 0.7)",
      }}
    >
      {children}
    </button>
  );
}
