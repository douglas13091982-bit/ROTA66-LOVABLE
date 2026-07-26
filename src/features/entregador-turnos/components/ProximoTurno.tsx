import { CalendarClock, MapPin } from "lucide-react";
import { endTime, formatRelative, minutesUntil } from "../logic/helpers";
import type { MeuTurno } from "../logic/types";

export function ProximoTurno({ proximo, now }: { proximo: MeuTurno | undefined; now: Date }) {
  if (!proximo) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/30 py-12 px-6 text-center">
        <div className="h-20 w-20 mx-auto rounded-full grid place-items-center bg-muted/20 mb-5">
          <CalendarClock className="h-9 w-9 text-muted-foreground/70" />
        </div>
        <p className="font-display text-xl text-foreground">Nenhum turno agendado</p>
        <p className="text-sm text-muted-foreground mt-2 leading-snug">
          Você ainda não tem nenhum turno marcado.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card/30 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-[0.2em] text-primary font-mono">
          Próximo turno
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          {formatRelative(
            minutesUntil(new Date(`${proximo.data_turno}T${proximo.hora_inicio}`), now),
          )}
        </span>
      </div>
      <div className="font-display text-5xl tracking-tight leading-none">
        {proximo.hora_inicio.slice(0, 5)}
        <span className="text-muted-foreground mx-2">—</span>
        {endTime(proximo)}
      </div>
      <div className="flex items-center gap-5 mt-3 text-sm text-muted-foreground">
        {proximo.lojas?.endereco || proximo.lojas?.nome ? (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {proximo.lojas?.nome ?? "Loja"}
          </span>
        ) : null}
        <span className="flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5" />
          R${" "}
          {(Number(proximo.valor_por_hora) * Number(proximo.duracao_horas))
            .toFixed(2)
            .replace(".", ",")}{" "}
          Base
        </span>
      </div>
    </div>
  );
}
