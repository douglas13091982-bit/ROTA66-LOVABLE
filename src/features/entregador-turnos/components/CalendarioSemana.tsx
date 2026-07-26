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
    <div className="rounded-xl border border-border/50 bg-card/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-[0.2em] text-primary font-mono font-bold">
          {monthLabel}
        </span>
        <span className="text-xs uppercase tracking-[0.2em] text-primary font-mono font-bold">
          Hoje
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((d) => {
          const isToday = d.getTime() === today.getTime();
          const hasTurno = turnosByDate.has(fmtKey(d));
          return (
            <div key={d.toISOString()} className="flex flex-col items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                {DOW_SHORT[d.getDay()]}
              </span>
              <span
                className={`grid place-items-center h-9 w-9 rounded-full font-display text-lg leading-none ${
                  isToday
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/80"
                }`}
              >
                {d.getDate()}
              </span>
              <span
                className={`h-0.5 w-4 rounded-full ${
                  isToday ? "bg-primary" : hasTurno ? "bg-primary/50" : "bg-transparent"
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
