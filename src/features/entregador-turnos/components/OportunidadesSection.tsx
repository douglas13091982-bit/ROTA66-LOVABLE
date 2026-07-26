import { CalendarClock, CalendarX2, Loader2 } from "lucide-react";
import type { TurnoDisponivel } from "../logic/types";
import { TurnoDisponivelCard } from "./TurnoDisponivelCard";

type Props = {
  loading: boolean;
  disponiveis: TurnoDisponivel[];
  onAceitar: (id: string) => Promise<void> | void;
};

export function OportunidadesSection({ loading, disponiveis, onAceitar }: Props) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
      </div>
    );
  }

  if (disponiveis.length === 0) {
    return (
      <div
        className="rounded-xl p-4 flex items-center gap-4 shadow-card"
        style={{
          background: "linear-gradient(100deg, #7E0000 0%, #AE0000 100%)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div className="h-14 w-14 shrink-0 rounded-full grid place-items-center bg-white/10">
          <CalendarX2 className="h-7 w-7 text-white/80" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-lg leading-tight text-white">Nenhum turno disponível</p>
          <p className="text-sm text-white/75 leading-snug mt-0.5">
            Quando uma loja publicar, você verá aqui em tempo real.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground font-mono">
        <CalendarClock className="h-4 w-4 text-primary" /> Oportunidades disponíveis
      </h2>
      <div className="space-y-3">
        {disponiveis.map((t) => (
          <TurnoDisponivelCard
            key={t.agendamento_id}
            t={t}
            onAceitar={() => onAceitar(t.agendamento_id)}
          />
        ))}
      </div>
    </section>
  );
}
