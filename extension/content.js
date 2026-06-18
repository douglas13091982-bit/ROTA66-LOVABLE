// Content script: injeta o hook no MAIN world e escuta as mensagens.
(function () {
  // Injeta inject.js no MAIN world
  const s = document.createElement("script");
  s.src = chrome.runtime.getURL("inject.js");
  s.onload = () => s.remove();
  (document.head || document.documentElement).appendChild(s);

  // Buffer das capturas mais recentes (limite de tamanho/quantidade)
  const MAX_ITEMS = 30;
  const MAX_BYTES_EACH = 4 * 1024 * 1024;
  let captures = [];

  window.addEventListener("message", (ev) => {
    if (!ev.data || ev.data.source !== "rotas66-ifood-hook") return;
    const { url, body } = ev.data;
    if (!body || body.length > MAX_BYTES_EACH) return;
    if (!/(catalog|catalogo|menu|categor|item)/i.test(url || "")) {
      // Mesmo sem match no URL, só guarda se for JSON com cara de cardápio
      if (!/categor/i.test(body) || !/(items|produtos|products)/i.test(body)) return;
    }
    captures.unshift({ url, body, ts: Date.now() });
    if (captures.length > MAX_ITEMS) captures.length = MAX_ITEMS;
    chrome.storage.local.set({ captures });
  });

  // Responde ao popup
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.type === "rotas66-get-captures") {
      chrome.storage.local.get(["captures"]).then((s) => sendResponse(s.captures || []));
      return true;
    }
    if (msg && msg.type === "rotas66-clear") {
      chrome.storage.local.set({ captures: [] }).then(() => sendResponse(true));
      return true;
    }
  });
})();

// Garante manifest-side declare
if (!chrome.runtime.getManifest().web_accessible_resources) {
  // noop — declarado abaixo, só silencia warnings
}
