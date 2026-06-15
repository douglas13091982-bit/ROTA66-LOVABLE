// Registro do Service Worker do PWA. Só registra em produção real (não em
// preview Lovable / iframe / dev). Em contextos bloqueados, desregistra
// qualquer SW antigo para evitar HTML preso em cache.

function isBlockedContext() {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  if (window.self !== window.top) return true;
  const url = new URL(window.location.href);
  if (url.searchParams.get("sw") === "off") return true;
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

export async function registerAppServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  if (isBlockedContext()) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        const url = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || "";
        if (url.endsWith("/sw.js")) await reg.unregister();
      }
    } catch {}
    return;
  }

  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (err) {
    console.warn("[pwa] falha ao registrar sw.js:", err);
  }
}
