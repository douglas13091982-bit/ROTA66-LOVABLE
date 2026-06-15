import { DOW_SHORT } from "../logic/constants";
import { fmtKey } from "../logic/helpers";
import type { MeuTurno } from "../logic/types";

type Props = {
  weekDays: Date[];
  today: Date;
  monthLabel: string;
  turnosByDate: Map<string, MeuTurno[]>;
};

export function CalendarioSemana({ weekDays, today, monthLabel, turnosByDate }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-mono">
          {monthLabel}
        </span>
        <span className="text-xs uppercase tracking-[0.2em] text-primary font-mono">Hoje</span>
      </div>
      <div className="grid grid-cols-6 gap-2">
        {weekDays.map((d) => {
          const isToday = d.getTime() === today.getTime();
          const hasTurno = turnosByDate.has(fmtKey(d));
          return (
            <div
              key={d.toISOString()}
              className={`relative flex flex-col items-center justify-center py-2.5 rounded-lg border transition-all ${
                isToday
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground"
              }`}
            >
              <span className="text-[10px] uppercase tracking-wider font-mono">
                {DOW_SHORT[d.getDay()]}
              </span>
              <span
                className={`font-display text-xl leading-none mt-1 ${
                  isToday ? "text-primary" : "text-foreground/80"
                }`}
              >
                {d.getDate()}
              </span>
              {hasTurno && !isToday && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary/70" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
