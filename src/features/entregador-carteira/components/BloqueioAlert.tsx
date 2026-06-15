import { AlertTriangle } from "lucide-react";

export function BloqueioAlert() {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex gap-3">
      <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
      <div className="text-sm text-red-200">
        <div className="font-bold">Você está bloqueado de receber novas ofertas</div>
        <div className="text-xs mt-1 text-red-200/80">
          Pague a mensalidade para voltar a receber ofertas.
        </div>
      </div>
    </div>
  );
}
