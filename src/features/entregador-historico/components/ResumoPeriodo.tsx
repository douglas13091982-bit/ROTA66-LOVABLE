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
    <div className="grid grid-cols-[1.35fr_1fr] gap-3 mb-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="text-[12px] uppercase tracking-[0.14em] text-white/55 mb-3">
          {periodo === "semanal" ? "Últimos 7 dias" : "Últimos 6 meses"}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div
            className="font-display text-[30px] leading-none whitespace-nowrap"
            style={{ color: "#E01818" }}
          >
            R$ {totalPeriodo.toFixed(2)}
          </div>
          <div
            className="h-12 w-12 shrink-0 rounded-full grid place-items-center"
            style={{ background: "rgba(224,24,24,0.12)", border: "1px solid rgba(224,24,24,0.35)" }}
          >
            <CircleDollarSign className="h-6 w-6" style={{ color: "#E01818" }} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="text-[12px] uppercase tracking-[0.14em] text-white/55 mb-3">Entregas</div>
        <div className="flex items-center justify-between gap-2">
          <div className="font-display text-[30px] leading-none text-white">{totalEntregas}</div>
          <div
            className="h-12 w-12 shrink-0 rounded-full grid place-items-center"
            style={{ background: "rgba(224,24,24,0.10)", border: "1px solid rgba(224,24,24,0.30)" }}
          >
            <ShoppingBag className="h-6 w-6" style={{ color: "#E01818" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
