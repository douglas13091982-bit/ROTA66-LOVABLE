import type { Periodo } from "../logic/types";

export function PeriodoToggle({
  periodo,
  onChange,
}: {
  periodo: Periodo;
  onChange: (p: Periodo) => void;
}) {
  return (
    <div className="flex gap-2 mb-5 p-1.5">
      {(["semanal", "mensal"] as Periodo[]).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`flex-1 px-4 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-[0.18em] transition-all duration-300 ease-premium ${
            periodo === p
              ? "bg-gradient-red text-primary-foreground shadow-red"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {p === "semanal" ? "Semanal" : "Mensal"}
        </button>
      ))}
    </div>
  );
}
