import { Bell, CalendarClock } from "lucide-react";
import { EntregadorShell } from "@/components/EntregadorShell";
import { useAuth } from "@/hooks/use-auth";
import { OportunidadesSection } from "./components/OportunidadesSection";
import { MeusTurnosSection } from "./components/MeusTurnosSection";
import { useTurnoActions } from "./hooks/use-turno-actions";
import { useTurnosEntregador } from "./hooks/use-turnos-entregador";

export function TurnosEntregadorPage() {
  const { user } = useAuth();
  const { disponiveis, meus, loading, carregar } = useTurnosEntregador(user?.id);
  const { aceitar, desmarcar, cancelando } = useTurnoActions(carregar);

  return (
    <EntregadorShell title="Turnos">
      <div className="space-y-5 max-w-4xl">
        <header className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <h1 className="flex items-center gap-2.5 font-display text-2xl tracking-tight text-foreground">
              <CalendarClock className="h-6 w-6 text-primary" />
              Turnos Disponíveis
            </h1>
            <Bell className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Escolha um dia para ver os turnos disponíveis.
          </p>
        </header>

        <OportunidadesSection loading={loading} disponiveis={disponiveis} onAceitar={aceitar} />
        <MeusTurnosSection meus={meus} cancelando={cancelando} onDesmarcar={desmarcar} />
      </div>
    </EntregadorShell>
  );
}
