/// <reference types="google.maps" />
// Loads Google Maps JS API once with the Places library.
let promise: Promise<typeof google> | null = null;

declare global {
  interface Window {
    __initGoogleMaps?: () => void;
    google: typeof google;
  }
}

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.google?.maps?.places) return Promise.resolve(window.google);
  if (promise) return promise;

  const existing = document.querySelector<HTMLScriptElement>(
    'script[src*="maps.googleapis.com/maps/api/js"]',
  );
  if (existing) {
    promise = new Promise((resolve, reject) => {
      const start = Date.now();
      const tick = () => {
        if (window.google?.maps?.importLibrary) return resolve(window.google);
        if (Date.now() - start > 15000) {
          promise = null;
          return reject(new Error("Google Maps não carregou a tempo"));
        }
        setTimeout(tick, 100);
      };
      tick();
    });
    return promise;
  }

  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
  if (!key) return Promise.reject(new Error("Google Maps browser key indisponível"));

  promise = new Promise((resolve, reject) => {
    window.__initGoogleMaps = () => resolve(window.google);
    const s = document.createElement("script");
    const params = new URLSearchParams({
      key,
      v: "weekly",
      libraries: "places",
      loading: "async",
      callback: "__initGoogleMaps",
    });
    if (channel) params.set("channel", channel);
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => reject(new Error("Falha ao carregar Google Maps"));
    document.head.appendChild(s);
  });
  return promise;
}
