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
      <div className="space-y-6 max-w-4xl">
        <OportunidadesSection
          loading={loading}
          disponiveis={disponiveis}
          onAceitar={aceitar}
        />
        <MeusTurnosSection meus={meus} cancelando={cancelando} onDesmarcar={desmarcar} />
      </div>
    </EntregadorShell>
  );
}
