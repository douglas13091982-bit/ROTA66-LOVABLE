import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BellRing, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { usePushNotifications } from "@/hooks/use-push-notifications";

const DISMISS_KEY = "cliente-push-banner-dismissed";

export function AtivarPushClienteBanner() {
  const { user } = useAuth();
  const { state, busy, enable } = usePushNotifications();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  });

  if (dismissed) return null;
  if (state === "loading" || state === "unsupported" || state === "denied") return null;
  if (state === "granted") return null;

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setDismissed(true);
  };

  const handleAtivar = async () => {
    try {
      await enable();
      toast.success("Pronto! Você vai receber as promoções das lojas.");
    } catch {
      toast.error("Não foi possível ativar as notificações.");
    }
  };

  return (
    <div
      className="rounded-xl p-3 flex items-start gap-3 mb-3"
      style={{
        background: "rgba(212,168,76,0.10)",
        border: "1px solid rgba(212,168,76,0.35)",
      }}
    >
      <BellRing className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--rota-gold)" }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">
          🔔 Receba promoções das lojas
        </p>
        <p className="text-[11px] text-white/70 mt-0.5">
          Ative as notificações e seja avisado quando lojas da sua cidade lançarem promoções.
        </p>
        {user ? (
          <button
            type="button"
            onClick={handleAtivar}
            disabled={busy}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md disabled:opacity-60"
            style={{ background: "var(--rota-gold)", color: "#04274f" }}
          >
            <BellRing className="w-3.5 h-3.5" />
            {busy ? "Ativando…" : "Ativar notificações"}
          </button>
        ) : (
          <Link
            to="/login"
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md"
            style={{ background: "var(--rota-gold)", color: "#04274f" }}
          >
            Entrar para ativar
          </Link>
        )}
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="text-white/60 hover:text-white shrink-0"
        aria-label="Fechar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
