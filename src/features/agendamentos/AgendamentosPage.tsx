import { useState } from "react";
import { LojaShell } from "@/components/LojaShell";
import { useMinhaLoja } from "@/hooks/use-loja";
import { NovoTurnoForm } from "./components/NovoTurnoForm";
import { PlanoMensalLock } from "./components/PlanoMensalLock";
import { TurnosList } from "./components/TurnosList";
import { useTurnosLoja } from "./hooks/use-turnos-loja";

export function AgendamentosPage() {
  const { data: loja } = useMinhaLoja();
  const [showForm, setShowForm] = useState(false);
  const { turnos, loading, carregar } = useTurnosLoja(loja?.id);

  if (!loja) {
    return (
      <LojaShell title="Turnos de entregador">
        <p className="text-muted-foreground">Crie sua loja primeiro.</p>
      </LojaShell>
    );
  }

  // Loja pode usar agendamentos se está em qualquer plano pago mensalmente
  // (plano_mensal_ativo só fica true quando taxa_por_pedido = 0; planos híbridos
  // como o "Pro" pagam mensalidade + taxa por pedido e também são "plano mensal").
  const l = loja as { plano_mensal_ativo?: boolean; mensalidade_valor?: number | string | null; plano_id?: string | null };
  const planoMensal = !!l.plano_mensal_ativo || Number(l.mensalidade_valor ?? 0) > 0 || !!l.plano_id;
  if (!planoMensal) {
    return (
      <LojaShell title="Turnos de entregador">
        <PlanoMensalLock />
      </LojaShell>
    );
  }

  return (
    <LojaShell title="Turnos de entregador">
      <div className="space-y-4 max-w-7xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-muted-foreground">
            Reserve entregadores para horários específicos oferecendo um valor por hora + uma taxa
            por cada entrega realizada no turno. A oportunidade vai para todos os entregadores
            externos e o primeiro a aceitar fica com o turno.
          </p>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="px-4 py-2 bg-gradient-red text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-md shadow-red hover:opacity-90"
          >
            {showForm ? "Fechar formulário" : "+ Novo turno"}
          </button>
        </div>

        {showForm && (
          <NovoTurnoForm
            lojaId={loja.id}
            onCreated={() => {
              setShowForm(false);
              carregar();
            }}
          />
        )}

        <TurnosList turnos={turnos} loading={loading} onChange={carregar} />
      </div>
    </LojaShell>
  );
}
