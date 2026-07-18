import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, X } from "lucide-react";

const DISMISS_KEY = "notif-urgente-dica-dismissed";

export function NotificacaoUrgenteDica() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  });
  const [open, setOpen] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    try { window.localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setDismissed(true);
  };

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Notificação não aparece na tela?
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure como <strong>Urgente</strong> no Android para o alerta aparecer por cima de qualquer app.
          </p>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400"
          >
            {open ? "Ocultar passo a passo" : "Ver passo a passo"}
            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {open && (
            <ol className="mt-2 space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
              <li>Abra <strong>Configurações</strong> do celular</li>
              <li>Vá em <strong>Apps</strong> → <strong>Rota 66</strong></li>
              <li>Toque em <strong>Notificações</strong></li>
              <li>Selecione a categoria <strong>“default”</strong> (ou “Novos pedidos”)</li>
              <li>
                Marque como <strong>Urgente</strong> — “Mostrar na tela e emitir som”
              </li>
              <li>Ative também <strong>Som</strong> e <strong>Vibração</strong></li>
            </ol>
          )}
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
    </div>
  );
}
