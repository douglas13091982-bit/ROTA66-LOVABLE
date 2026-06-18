// Roda no MAIN world da página do iFood para interceptar fetch/XHR.
// Captura respostas JSON e envia ao content script via window.postMessage.
(function () {
  if (window.__rotas66_ifood_hook__) return;
  window.__rotas66_ifood_hook__ = true;

  function send(url, body) {
    try {
      window.postMessage(
        { source: "rotas66-ifood-hook", url: String(url || ""), body: String(body || "") },
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
      const ct = clone.headers.get("content-type") || "";
      if (ct.includes("json")) {
        clone.text().then((t) => send(res.url, t)).catch(() => {});
      }
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
        const ct = this.getResponseHeader("content-type") || "";
        if (ct.includes("json") && this.responseText) {
          send(this.__rotas66_url || this.responseURL, this.responseText);
        }
      } catch (_) {}
    });
    return origSend.apply(this, arguments);
  };
})();
