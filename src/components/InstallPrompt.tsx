import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Eventos do navegador para instalação do PWA
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "rota66:install-dismissed-at";
const DISMISS_DAYS = 7;

function isPreviewOrIframe() {
  if (typeof window === "undefined") return true;
  if (window.self !== window.top) return true;
  const h = window.location.hostname;
  return (
    h.startsWith("id-preview--") ||
    h.startsWith("preview--") ||
    h === "lovableproject.com" ||
    h.endsWith(".lovableproject.com") ||
    h === "lovableproject-dev.com" ||
    h.endsWith(".lovableproject-dev.com") ||
    h === "beta.lovable.dev" ||
    h.endsWith(".beta.lovable.dev")
  );
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function recentlyDismissed() {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    const ageMs = Date.now() - Number(ts);
    return ageMs < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // ====== Diagnóstico PWA ======
    const log = (msg: string, data?: unknown) =>
      console.log(`%c[PWA]%c ${msg}`, "color:#cc2229;font-weight:bold", "color:inherit", data ?? "");

    log("Iniciando diagnóstico de instalabilidade");
    log("URL:", window.location.href);
    log("Protocolo HTTPS?", window.location.protocol === "https:");
    log("É iframe/preview?", isPreviewOrIframe());
    log("Já está instalado (standalone)?", isStandalone());
    log("Dispensado recentemente?", recentlyDismissed());
    log("Service Worker suportado?", "serviceWorker" in navigator);
    log("BeforeInstallPromptEvent suportado?", "onbeforeinstallprompt" in window);
    log("User Agent:", navigator.userAgent);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        log(`SWs registrados: ${regs.length}`, regs.map((r) => r.active?.scriptURL || r.installing?.scriptURL));
      });
    }

    fetch("/manifest.webmanifest")
      .then((r) => {
        log(`Manifest status: ${r.status} (${r.headers.get("content-type")})`);
        return r.ok ? r.json() : null;
      })
      .then((m) => m && log("Manifest carregado:", m))
      .catch((e) => log("Erro ao carregar manifest:", e));

    if (isPreviewOrIframe()) {
      log("⚠️ Em preview/iframe Lovable — beforeinstallprompt NÃO dispara aqui. Teste no app publicado (drive-fleet.lovable.app).");
    }
    if (isStandalone()) {
      log("ℹ️ App já está em modo standalone — instalação não é mais oferecida.");
    }
    if (recentlyDismissed()) {
      log("ℹ️ Usuário dispensou nos últimos 7 dias. Limpe localStorage['rota66:install-dismissed-at'] para resetar.");
    }

    if (isPreviewOrIframe() || isStandalone() || recentlyDismissed()) return;

    const onPrompt = (e: Event) => {
      log("✅ beforeinstallprompt disparou! App é instalável.", e);
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      log("🎉 App foi instalado (appinstalled)");
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // Aviso se nada acontecer em 10s
    const timeout = window.setTimeout(() => {
      log(
        "⏱️ 10s sem beforeinstallprompt. Possíveis causas: SW sem fetch handler, manifest inválido, app já instalado, falta de engajamento do usuário, ou navegador sem suporte (Safari iOS não suporta)."
      );
    }, 10000);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || !deferred) return null;

  const handleInstall = async () => {
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "dismissed") {
        try {
          localStorage.setItem(DISMISS_KEY, String(Date.now()));
        } catch {}
      }
    } finally {
      setDeferred(null);
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setDeferred(null);
  };

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Instalar ROTA 66</p>
          <p className="text-xs text-muted-foreground">
            Adicione o app à tela inicial para acesso rápido e melhor desempenho.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={handleInstall}>
              Instalar
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              Agora não
            </Button>
          </div>
        </div>
        <button
          aria-label="Fechar"
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
