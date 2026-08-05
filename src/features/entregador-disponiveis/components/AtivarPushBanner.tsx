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
    <div className="bg-[#0d2c54] border border-[#0d2c54]/30 rounded-2xl p-4 flex items-start gap-4 shadow-lg shadow-[#0d2c54]/10">
      <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
        <Bell className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-white uppercase tracking-wider">
          Ative as notificações
        </p>
        <p className="text-xs text-white/70 mt-0.5 leading-relaxed">
          Receba um alerta assim que um novo pedido entrar no seu pool.
        </p>
        <button
          type="button"
          onClick={handleAtivar}
          disabled={busy}
          className="mt-3 inline-flex items-center gap-2 bg-[#AE0000] text-white text-[11px] font-black uppercase tracking-[0.1em] px-4 py-2 rounded-xl disabled:opacity-60 shadow-lg shadow-[#AE0000]/20 active:scale-95 transition-transform"
        >
          <Bell className="w-3.5 h-3.5" />
          {busy ? "Ativando…" : "Ativar notificações"}
        </button>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="text-white/40 hover:text-white shrink-0 p-1"
        aria-label="Fechar"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
