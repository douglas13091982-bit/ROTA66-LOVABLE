// Content script: injeta o hook no MAIN world e escuta as mensagens.
(function () {
  console.log("[Rotas66] content script ativo em", location.href);

  // Injeta inject.js no MAIN world
  try {
    const s = document.createElement("script");
    s.src = chrome.runtime.getURL("inject.js");
    s.onload = () => s.remove();
    (document.head || document.documentElement).appendChild(s);
  } catch (e) {
    console.warn("[Rotas66] falha ao injetar inject.js", e);
  }

  const MAX_ITEMS = 80;
  const MAX_BYTES_EACH = 6 * 1024 * 1024;
  let captures = [];
  let totalSeen = 0;

  window.addEventListener("message", (ev) => {
    if (!ev.data || ev.data.source !== "rotas66-ifood-hook") return;
    const { url, body } = ev.data;
    if (!body || body.length > MAX_BYTES_EACH) return;
    totalSeen++;

    // Heurística: só guarda se parece ter cardápio (categorias OU itens com preço)
    const looksMenu =
      /(categor|menu|catalog|cardapio|cardápio)/i.test(url || "") ||
      (/(categor|menu|catalog)/i.test(body) &&
        /(items|produtos|products|itens)/i.test(body)) ||
      /unitPrice|"price"\s*:|"preco"\s*:/i.test(body);

    if (!looksMenu) return;

    captures.unshift({ url, body, ts: Date.now() });
    if (captures.length > MAX_ITEMS) captures.length = MAX_ITEMS;
    chrome.storage.local.set({ captures, totalSeen });
    console.log("[Rotas66] capturado:", url, "(", body.length, "bytes ) total guardados:", captures.length);
  });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.type === "rotas66-get-captures") {
      chrome.storage.local.get(["captures", "totalSeen"]).then((s) =>
        sendResponse({ captures: s.captures || [], totalSeen: s.totalSeen || 0 })
      );
      return true;
    }
    if (msg && msg.type === "rotas66-clear") {
      captures = [];
      totalSeen = 0;
      chrome.storage.local.set({ captures: [], totalSeen: 0 }).then(() => sendResponse(true));
      return true;
    }
  });
})();
