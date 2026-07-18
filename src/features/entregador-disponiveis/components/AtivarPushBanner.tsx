import { useState } from "react";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export function AtivarPushBanner() {
  const { state, busy, enable } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  if (state === "loading" || state === "granted" || state === "unsupported") return null;

  const isDenied = state === "denied";

  const handleAtivar = async () => {
    try {
      await enable();
      toast.success("Notificações ativadas!");
    } catch {
      toast.error("Não foi possível ativar as notificações.");
    }
  };

  return (
    <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 flex items-start gap-3">
      <Bell className="w-5 h-5 text-primary shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {isDenied ? "Notificações bloqueadas" : "Ative as notificações"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isDenied
            ? "Libere as notificações nas configurações do app para receber alertas de novos pedidos."
            : "Receba um alerta assim que um novo pedido entrar no seu pool."}
        </p>
        {!isDenied && (
          <button
            type="button"
            onClick={handleAtivar}
            disabled={busy}
            className="mt-2 inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-md disabled:opacity-60"
          >
            <Bell className="w-3.5 h-3.5" />
            {busy ? "Ativando…" : "Ativar notificações"}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground shrink-0"
        aria-label="Fechar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
