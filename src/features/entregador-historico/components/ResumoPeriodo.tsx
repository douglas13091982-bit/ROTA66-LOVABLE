import { CircleDollarSign, ShoppingBag } from "lucide-react";
import type { Periodo } from "../logic/types";

export function ResumoPeriodo({
  periodo,
  totalPeriodo,
  totalEntregas,
}: {
  periodo: Periodo;
  totalPeriodo: number;
  totalEntregas: number;
}) {
  return (
    <div className="grid w-full grid-cols-[1.35fr_1fr] gap-3 mb-4 overflow-hidden">
      <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
        <div className="truncate text-[11px] sm:text-[12px] uppercase tracking-[0.1em] text-white/55 mb-3">
          {periodo === "semanal" ? "Últimos 7 dias" : "Últimos 6 meses"}
        </div>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div
            className="min-w-0 truncate font-display text-[22px] sm:text-[28px] leading-none"
            style={{ color: "#e3000f" }}
          >
            R$ {totalPeriodo.toFixed(2)}
          </div>
          <div
            className="h-9 w-9 sm:h-11 sm:w-11 shrink-0 rounded-full grid place-items-center"
            style={{ background: "rgba(227,0,15,0.12)", border: "1px solid rgba(227,0,15,0.35)" }}
          >
            <CircleDollarSign className="h-5 w-5" style={{ color: "#e3000f" }} />
          </div>
        </div>
      </div>

      <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
        <div className="truncate text-[11px] sm:text-[12px] uppercase tracking-[0.1em] text-white/55 mb-3">
          Entregas
        </div>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="min-w-0 truncate font-display text-[22px] sm:text-[28px] leading-none text-white">
            {totalEntregas}
          </div>
          <div
            className="h-9 w-9 sm:h-11 sm:w-11 shrink-0 rounded-full grid place-items-center"
            style={{ background: "rgba(227,0,15,0.10)", border: "1px solid rgba(227,0,15,0.30)" }}
          >
            <ShoppingBag className="h-5 w-5" style={{ color: "#e3000f" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
