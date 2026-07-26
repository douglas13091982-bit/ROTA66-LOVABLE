// Limpa o contador (badge) do ícone do app e as notificações pendentes na
// bandeja. No TWA/PWA Android o badge só zera quando chamamos clearAppBadge()
// explicitamente — abrir o app não zera sozinho, e como as notificações usam
// requireInteraction elas ficam acumulando (25, 26, 27...).

export async function limparBadgeApp() {
  if (typeof window === "undefined") return;

  try {
    const nav = navigator as Navigator & { clearAppBadge?: () => Promise<void> };
    if (typeof nav.clearAppBadge === "function") await nav.clearAppBadge();
  } catch {
    /* noop */
  }

  try {
    if (!("serviceWorker" in navigator)) return;
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      try {
        const notifs = await reg.getNotifications();
        for (const n of notifs) n.close();
      } catch {
        /* noop */
      }
    }
  } catch {
    /* noop */
  }

  // Alguns navegadores recalculam o badge ao fechar notificações; zera de novo.
  try {
    const nav = navigator as Navigator & { clearAppBadge?: () => Promise<void> };
    if (typeof nav.clearAppBadge === "function") await nav.clearAppBadge();
  } catch {
    /* noop */
  }
}

/** Zera o badge ao abrir o app e sempre que ele volta ao primeiro plano. */
export function instalarLimpezaBadge(): () => void {
  if (typeof window === "undefined") return () => {};

  void limparBadgeApp();

  const onVisible = () => {
    if (document.visibilityState === "visible") void limparBadgeApp();
  };
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onVisible);

  return () => {
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", onVisible);
  };
}
