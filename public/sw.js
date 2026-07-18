// Service Worker do ROTA 66 — fornece o handler `fetch` necessário para que
// o navegador considere o site instalável (beforeinstallprompt) e também
// recebe Web Push. Não faz cache agressivo: passa toda navegação pela rede e
// só faz fallback básico para assets estáticos, evitando servir HTML antigo.

const CACHE = "rota66-runtime-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
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

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // HTML / navegação: sempre rede primeiro (sem cache de HTML)
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
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
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
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
