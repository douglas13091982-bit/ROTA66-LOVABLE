import type { Periodo } from "../logic/types";

export function PeriodoToggle({
  periodo,
  onChange,
}: {
  periodo: Periodo;
  onChange: (p: Periodo) => void;
}) {
  return (
    <div className="flex gap-1 mb-4 p-1 rounded-full border border-white/10 bg-white/[0.03]">
      {(["semanal", "mensal"] as Periodo[]).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`flex-1 px-4 py-2.5 rounded-full text-[13px] font-bold uppercase tracking-[0.12em] transition-all duration-300 ${
            periodo === p ? "text-white" : "text-white/55"
          }`}
          style={
            periodo === p
              ? {
                  background: "linear-gradient(100deg, #e3000f 0%, #e3000f 100%)",
                  boxShadow: "0 8px 20px -10px rgba(227,0,15,0.8)",
                }
              : undefined
          }
        >
          {p === "semanal" ? "Semanal" : "Mensal"}
        </button>
      ))}
    </div>
  );
}
