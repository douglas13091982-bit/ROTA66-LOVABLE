import { CalendarClock, Loader2 } from "lucide-react";
import type { TurnoDisponivel } from "../logic/types";
import { TurnoDisponivelCard } from "./TurnoDisponivelCard";

type Props = {
  loading: boolean;
  disponiveis: TurnoDisponivel[];
  onAceitar: (id: string) => Promise<void> | void;
};

export function OportunidadesSection({ loading, disponiveis, onAceitar }: Props) {
  return (
    <section>
      <h2 className="font-display text-xl mb-3 flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-primary" /> Oportunidades disponíveis
      </h2>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : disponiveis.length === 0 ? (
        <div
          className="rounded-lg p-8 text-center shadow-card"
          style={{ background: "#ef4444", border: "1px solid #ef4444" }}
        >
          <p className="text-sm font-medium" style={{ color: "#ffffff" }}>
            Nenhum turno disponível no momento. Quando uma loja publicar, você verá aqui em tempo
            real.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {disponiveis.map((t) => (
            <TurnoDisponivelCard
              key={t.agendamento_id}
              t={t}
              onAceitar={() => onAceitar(t.agendamento_id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
