// Integração OneSignal — App ID público (seguro no client).
// O envio de push é feito server-side em /api/public/send-push usando a
// ONESIGNAL_REST_API_KEY (secret), que NÃO pode aparecer no client.

export const ONESIGNAL_APP_ID = "e9e73215-0750-464d-859e-674e97f00a68";

/**
 * Bridges suportadas (em ordem de prioridade):
 *
 * 1. `window.OneSignalBridge.setExternalId(id)` / `clearExternalId()` — bridge
 *    customizado injetado pela WebView Android do APK encapsulado.
 *    No lado nativo (Kotlin/Java), depois de iniciar o SDK, o wrapper deve
 *    expor um JavascriptInterface chamado `OneSignalBridge` com os métodos
 *    `setExternalId(String)` e `clearExternalId()` que chamam, respectivamente,
 *    `OneSignal.login(id)` e `OneSignal.logout()`.
 *
 * 2. `window.plugins.OneSignal` — plugin Cordova/Capacitor (se um dia migrar
 *    para Capacitor + onesignal-cordova-plugin).
 *
 * Em navegador comum, nada acontece (silenciosamente). Web Push em browser
 * continua usando o fluxo VAPID já existente em /api/public/send-push.
 */
type OneSignalBridge = {
  setExternalId?: (id: string) => void;
  clearExternalId?: () => void;
};

declare global {
  interface Window {
    OneSignalBridge?: OneSignalBridge;
    plugins?: { OneSignal?: { login?: (id: string) => void; logout?: () => void } };
  }
}

export function setOneSignalExternalId(userId: string) {
  if (typeof window === "undefined" || !userId) return;
  try {
    if (window.OneSignalBridge?.setExternalId) {
      window.OneSignalBridge.setExternalId(userId);
      return;
    }
    if (window.plugins?.OneSignal?.login) {
      window.plugins.OneSignal.login(userId);
    }
  } catch (e) {
    console.warn("[onesignal] setExternalId falhou:", e);
  }
}

export function clearOneSignalExternalId() {
  if (typeof window === "undefined") return;
  try {
    if (window.OneSignalBridge?.clearExternalId) {
      window.OneSignalBridge.clearExternalId();
      return;
    }
    if (window.plugins?.OneSignal?.logout) {
      window.plugins.OneSignal.logout();
    }
  } catch (e) {
    console.warn("[onesignal] clearExternalId falhou:", e);
  }
}

/** Detecta se estamos rodando dentro do APK encapsulado. */
export function isInsideEntregadorApk(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.OneSignalBridge) || /Rota66Entregador/i.test(navigator.userAgent);
}
