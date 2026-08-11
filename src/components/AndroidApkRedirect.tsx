import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

const STORAGE_KEY = "rota66:apk-redirect-visto";

// Redireciona Android (navegador comum) para /baixar-app na primeira visita.
// NÃO redireciona:
// - iPhone/desktop
// - dentro do TWA/APK instalado (display-mode standalone, ou referrer android-app://)
// - se o usuário já foi redirecionado uma vez (flag em localStorage)
// - se já está numa rota "de app" (/baixar-app, /login, /cadastro, /reset-password, /rastreio, /c/, /loja/, /calcular-frete, /clientes, /entregador, /loja/, /admin, área autenticada)
export function AndroidApkRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      // Já viu? não redireciona mais
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      /* noop */
    }

    const ua = navigator.userAgent || "";
    const isAndroid = /Android/i.test(ua);
    if (!isAndroid) return;

    // Dentro do TWA/PWA instalado — não redireciona
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      // TWA vem com referrer android-app://
      document.referrer.startsWith("android-app://") ||
      // iOS-only, mas por garantia
      (navigator as any).standalone === true;
    if (isStandalone) return;

    // Só redireciona a partir da home ("/"). Outras rotas mantêm o fluxo.
    const path = window.location.pathname;
    if (path !== "/") return;

    // Marca como visto e navega
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* noop */
    }
    router.navigate({ to: "/baixar-app" });
  }, [router]);

  return null;
}
