import { CalendarClock, Loader2 } from "lucide-react";
import type { TurnoRow } from "../logic/types";
import { TurnoCard } from "./TurnoCard";

export function TurnosList({
  turnos,
  loading,
  onChange,
}: {
  turnos: TurnoRow[];
  loading: boolean;
  onChange: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
      </div>
    );
  }
  if (turnos.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-10 text-center shadow-card">
        <CalendarClock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Nenhum turno cadastrado.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {turnos.map((t) => (
        <TurnoCard key={t.id} t={t} onChange={onChange} />
      ))}
    </div>
  );
}
