import { useState } from "react";
import { Bell, BellRing, X, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/use-push-notifications";

const DISMISS_KEY = "push-banner-dismissed";

export function AtivarPushBanner() {
  const { state, busy, enable } = usePushNotifications();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  });

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    try { window.localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setDismissed(true);
  };

  if (dismissed) return null;
  if (state === "loading" || state === "unsupported") return null;
  // Não mostrar banner de "bloqueadas" — o usuário precisa liberar manualmente nas configs do sistema
  if (state === "denied") return null;

  const isGranted = state === "granted";
  if (isGranted) return null;

  const handleAtivar = async () => {
    try {
      await enable();
      toast.success("Notificações ativadas!");
    } catch {
      toast.error("Não foi possível ativar as notificações.");
    }
  };

  return (
    <button
      onClick={handleAtivar}
      disabled={busy}
      className="relative w-full flex items-center justify-between gap-4 p-4 rounded-2xl bg-[#1a2b4b]/90 backdrop-blur-md border border-white/10 shadow-xl text-left"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#AE0000] flex items-center justify-center">
          <Bell className="h-5 w-5 text-white animate-bounce" />
        </div>
        <div className="text-left">
          <p className="text-sm font-black text-white uppercase tracking-tight">Ativar Notificações</p>
          <p className="text-[11px] text-white/60 font-medium">Receba novos pedidos instantaneamente</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <ArrowRight className="h-5 w-5 text-white/40" />
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 hover:bg-white/10 rounded-full"
        >
          <X className="w-4 h-4 text-white/20" />
        </button>
      </div>
    </button>
  );
}
