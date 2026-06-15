import { Lock } from "lucide-react";

export function PlanoMensalLock() {
  return (
    <div className="max-w-2xl bg-card border border-border rounded-lg p-8 text-center shadow-card">
      <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
      <h2 className="font-display text-2xl mb-2">Recurso exclusivo do plano mensal</h2>
      <p className="text-muted-foreground text-sm">
        Os turnos de entregador estão disponíveis apenas para lojas com plano mensal ativo.
      </p>
    </div>
  );
}
