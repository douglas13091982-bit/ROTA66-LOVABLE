import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

const DISMISS_KEY = "notif-urgente-dica-dismissed";

export function NotificacaoUrgenteDica() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    try { window.localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setDismissed(true);
  };

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          Notificação não aparece na tela?
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure a notificação do Rota 66 como <strong>Urgente</strong> nas configurações do Android para o alerta aparecer por cima de qualquer app.
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="text-muted-foreground hover:text-foreground shrink-0"
        aria-label="Fechar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

