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
    <div className="p-6 mb-4 grid grid-cols-2 gap-4">
      <div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
          {periodo === "semanal" ? "Últimos 7 dias" : "Últimos 6 meses"}
        </div>
        <div className="font-display text-4xl md:text-5xl text-emerald-400 leading-none whitespace-nowrap">
          R$ {totalPeriodo.toFixed(2)}
        </div>
      </div>
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
          Entregas
        </div>
        <div className="font-display text-4xl md:text-5xl leading-none">{totalEntregas}</div>
      </div>
    </div>
  );
}
