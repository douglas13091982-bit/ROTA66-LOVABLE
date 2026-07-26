import { MONTH_NAMES } from "../logic/constants";
import {
  computeWeekDays,
  filtrarFuturos,
  filtrarSemana,
  turnosByDate,
} from "../logic/helpers";
import type { MeuTurno } from "../logic/types";
import { AgendaSemanal } from "./AgendaSemanal";
import { CalendarioSemana } from "./CalendarioSemana";
import { ProximoTurno } from "./ProximoTurno";

type Props = {
  meus: MeuTurno[];
  cancelando: boolean;
  onDesmarcar: (id: string) => Promise<boolean> | Promise<void>;
};

export function MeusTurnosSection({ meus, cancelando, onDesmarcar }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekDays = computeWeekDays(today);
  const weekEnd = new Date(weekDays[weekDays.length - 1]);
  weekEnd.setHours(23, 59, 59, 999);

  const now = new Date();
  const futuros = filtrarFuturos(meus, now);
  const restantes = filtrarSemana(meus, now, weekEnd);
  const proximo = futuros[0];
  const monthLabel = MONTH_NAMES[today.getMonth()].toUpperCase();

  return (
    <section className="space-y-4">
      <CalendarioSemana
        weekDays={weekDays}
        today={today}
        monthLabel={monthLabel}
        turnosByDate={turnosByDate(meus)}
      />

      <ProximoTurno proximo={proximo} now={now} />

      <AgendaSemanal restantes={restantes} cancelando={cancelando} onDesmarcar={onDesmarcar} />
    </section>
  );
}
