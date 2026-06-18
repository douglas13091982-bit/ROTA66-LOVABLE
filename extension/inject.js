// Roda no MAIN world da página do iFood para interceptar fetch/XHR.
// Captura QUALQUER resposta JSON e envia ao content script via window.postMessage.
(function () {
  if (window.__rotas66_ifood_hook__) return;
  window.__rotas66_ifood_hook__ = true;
  console.log("[Rotas66] hook injetado em", location.href);

  function send(url, body) {
    try {
      if (!body || typeof body !== "string") return;
      // só algo que pareça JSON
      const t = body.trim();
      if (!(t.startsWith("{") || t.startsWith("["))) return;
      window.postMessage(
        { source: "rotas66-ifood-hook", url: String(url || ""), body: body },
        "*"
      );
    } catch (_) {}
  }

  // ---- fetch ----
  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await origFetch.apply(this, args);
    try {
      const clone = res.clone();
      clone.text().then((t) => send(res.url, t)).catch(() => {});
    } catch (_) {}
    return res;
  };

  // ---- XHR ----
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__rotas66_url = url;
    return origOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    this.addEventListener("load", () => {
      try {
        if (this.responseType === "" || this.responseType === "text") {
          if (this.responseText) {
            send(this.__rotas66_url || this.responseURL, this.responseText);
          }
        } else if (this.responseType === "json" && this.response) {
          send(this.__rotas66_url || this.responseURL, JSON.stringify(this.response));
        }
      } catch (_) {}
    });
    return origSend.apply(this, arguments);
  };
})();
