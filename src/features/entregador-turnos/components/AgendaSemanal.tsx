import { useState } from "react";
import { DOW_LONG, MONTH_NAMES } from "../logic/constants";
import { endTime } from "../logic/helpers";
import type { MeuTurno } from "../logic/types";
import { TurnoInlineDetails } from "./TurnoInlineDetails";

type Props = {
  restantes: MeuTurno[];
  cancelando: boolean;
  onDesmarcar: (id: string) => Promise<boolean> | Promise<void>;
};

export function AgendaSemanal({ restantes, cancelando, onDesmarcar }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div>
      <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-mono mb-3">
        Agenda semanal
      </h3>
      {restantes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem outros turnos esta semana.</p>
      ) : (
        <ul className="divide-y divide-border/40">
          {restantes.map((m) => {
            const d = new Date(`${m.data_turno}T${m.hora_inicio}`);
            const isOpen = expandedId === m.id;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : m.id)}
                  className="w-full flex items-center justify-between py-3 group cursor-pointer transition-colors hover:bg-white/[0.02] -mx-2 px-2 rounded text-left"
                >
                  <div className="min-w-0">
                    <div className="text-base text-foreground">
                      {DOW_LONG[d.getDay()]}, {d.getDate()}{" "}
                      {MONTH_NAMES[d.getMonth()].slice(0, 3)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {m.hora_inicio.slice(0, 5)} — {endTime(m)}
                    </div>
                  </div>
                  <span
                    className={`transition-colors ${
                      isOpen
                        ? "text-primary rotate-90"
                        : "text-muted-foreground/60 group-hover:text-primary"
                    }`}
                  >
                    ›
                  </span>
                </button>
                {isOpen && (
                  <TurnoInlineDetails
                    turno={m}
                    cancelando={cancelando}
                    onDesmarcar={async () => {
                      const ok = await onDesmarcar(m.id);
                      if (ok) setExpandedId(null);
                    }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
