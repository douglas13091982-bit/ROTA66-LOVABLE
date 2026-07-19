// Service Worker do ROTA 66 — fornece o handler `fetch` necessário para que
// o navegador considere o site instalável (beforeinstallprompt) e também
// recebe Web Push. Estratégia:
// - HTML/navegação: network-first com timeout de 3s (fallback pro cache);
// - Assets estáticos com hash: stale-while-revalidate;
// - Precache de ícones e recursos críticos no install para reduzir tempo
//   até o primeiro pixel quando o TWA abre offline/lento.

const CACHE = "rota66-runtime-v2";
const PRECACHE_URLS = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/notification-icon.webp",
  "/icons/badge-72.png",
];
const NAV_TIMEOUT_MS = 3000;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE);
        await Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            fetch(url, { cache: "reload" })
              .then((res) => (res.ok ? cache.put(url, res.clone()) : null))
              .catch(() => null)
          )
        );
      } catch {}
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

function networkWithTimeout(request, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    fetch(request).then(
      (res) => {
        clearTimeout(timer);
        resolve(res);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // HTML / navegação: rede primeiro com timeout de 3s, fallback pro cache
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await networkWithTimeout(req, NAV_TIMEOUT_MS);
          return res;
        } catch {
          const cached = await caches.match(req);
          if (cached) return cached;
          // último recurso: tenta rede sem timeout
          return fetch(req);
        }
      })()
    );
    return;
  }

  // Assets estáticos com hash (build): stale-while-revalidate leve
  if (/\.(js|css|woff2?|png|jpg|jpeg|svg|webp|ico)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "ROTA 66", body: event.data ? event.data.text() : "" };
  }

  const fallbackTag = `rota66-push-${Date.now()}`;
  const title = data.title || "🚨 Nova entrega disponível";
  const options = {
    body: data.body || "Toque para ver os pedidos disponíveis.",
    icon: "/icons/notification-icon.webp",
    badge: "/icons/badge-72.png",
    vibrate: [200, 80, 200],
    tag: data.tag || fallbackTag,
    renotify: true,
    requireInteraction: true,
    data: { url: data.url || "/entregador/disponiveis" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) ||
    "/entregador/disponiveis";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        try {
          const url = new URL(client.url);
          if (url.origin === self.location.origin && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        } catch {}
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
