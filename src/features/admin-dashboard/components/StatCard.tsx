import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  accent?: boolean;
  sub?: string;
};

export function StatCard({ icon: Icon, label, value, accent, sub }: Props) {
  return (
    <div className="pp-card pp-card-hover rounded-2xl p-5 relative overflow-hidden">
      {accent && (
        <div
          className="absolute -top-12 -right-12 h-32 w-32 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, oklch(0.78 0.16 75 / 0.16), transparent 70%)",
          }}
        />
      )}
      <div className="flex items-start justify-between mb-6">
        <span className="pp-eyebrow">{label}</span>
        <div className={`pp-disc ${accent ? "pp-disc-accent" : ""}`}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
      <div className="pp-num text-[34px] text-white">{value}</div>
      {sub && <div className="mt-1.5 text-[11px] text-white/45">{sub}</div>}
    </div>
  );
}
