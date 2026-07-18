// Service Worker dedicado a Web Push para o ROTA 66 Entregador.
// Não faz cache de assets — apenas escuta `push` e `notificationclick`.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
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
    icon: "/icons/notification-icon.png",
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
  const targetUrl = (event.notification.data && event.notification.data.url) || "/entregador/disponiveis";
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
