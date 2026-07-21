// Service Worker dedicado a Web Push para o ROTA 66 Entregador.
// Não faz cache de assets — apenas escuta `push` e `notificationclick`.
// v4 — ícone grande à direita sobrescrito com PNG 1x1 transparente para ocultar.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

async function atualizarAppBadge() {
  try {
    if (typeof self.navigator?.setAppBadge !== "function") return;
    const notifs = await self.registration.getNotifications();
    if (notifs.length > 0) {
      await self.navigator.setAppBadge(notifs.length);
    } else if (typeof self.navigator.clearAppBadge === "function") {
      await self.navigator.clearAppBadge();
    }
  } catch {}
}

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
    // icon/image omitidos propositalmente para não exibir thumbnail grande à direita
    badge: "/icons/badge-72.png",
    vibrate: [200, 80, 200],
    tag: data.tag || fallbackTag,
    renotify: true,
    requireInteraction: true,
    data: { url: data.url || "/entregador/disponiveis" },
  };
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);
      await atualizarAppBadge();
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/entregador/disponiveis";
  event.waitUntil(
    (async () => {
      try {
        const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const client of clientList) {
          try {
            const url = new URL(client.url);
            if (url.origin === self.location.origin && "focus" in client) {
              client.navigate(targetUrl);
              await client.focus();
              await atualizarAppBadge();
              return;
            }
          } catch {}
        }
        if (self.clients.openWindow) {
          await self.clients.openWindow(targetUrl);
        }
      } finally {
        await atualizarAppBadge();
      }
    })()
  );
});

self.addEventListener("notificationclose", (event) => {
  event.waitUntil(atualizarAppBadge());
});
