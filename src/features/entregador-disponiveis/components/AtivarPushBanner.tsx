import { useState } from "react";
import { Bell, BellRing, X } from "lucide-react";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/use-push-notifications";

const DISMISS_KEY = "push-banner-dismissed";

export function AtivarPushBanner() {
  const { state, busy, enable } = usePushNotifications();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  });

  const handleDismiss = () => {
    try { window.localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setDismissed(true);
  };

  if (dismissed) return null;
  if (state === "loading" || state === "unsupported") return null;
  // Não mostrar banner de "bloqueadas" — o usuário precisa liberar manualmente nas configs do sistema
  if (state === "denied") return null;

  const isGranted = state === "granted";

  const handleAtivar = async () => {
    try {
      await enable();
      toast.success("Notificações ativadas!");
    } catch {
      toast.error("Não foi possível ativar as notificações.");
    }
  };

  if (isGranted) return null;



  return (
    <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 flex items-start gap-3">
      <Bell className="w-5 h-5 text-primary shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          Ative as notificações
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Receba um alerta assim que um novo pedido entrar no seu pool.
        </p>
        <button
          type="button"
          onClick={handleAtivar}
          disabled={busy}
          className="mt-2 inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-md disabled:opacity-60"
        >
          <Bell className="w-3.5 h-3.5" />
          {busy ? "Ativando…" : "Ativar notificações"}
        </button>
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
