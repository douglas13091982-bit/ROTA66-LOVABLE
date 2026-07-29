import { useEffect } from "react";

/**
 * Mantém a tela do celular acesa enquanto o app do entregador estiver aberto.
 * Usa a Screen Wake Lock API (Chrome/Android, TWA). Reativa automaticamente
 * quando o app volta do segundo plano, pois o lock é liberado pelo sistema.
 */
export function useWakeLock(ativo = true) {
  useEffect(() => {
    if (!ativo) return;
    if (typeof navigator === "undefined") return;
    const wl = (navigator as any).wakeLock;
    if (!wl?.request) return;

    let sentinel: any = null;
    let cancelado = false;

    const solicitar = async () => {
      if (cancelado) return;
      if (document.visibilityState !== "visible") return;
      try {
        sentinel = await wl.request("screen");
        sentinel?.addEventListener?.("release", () => {
          sentinel = null;
        });
      } catch {
        // Bateria baixa ou permissão negada — ignora silenciosamente.
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !sentinel) void solicitar();
    };

    void solicitar();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelado = true;
      document.removeEventListener("visibilitychange", onVisibility);
      try {
        void sentinel?.release?.();
      } catch {}
      sentinel = null;
    };
  }, [ativo]);
}
