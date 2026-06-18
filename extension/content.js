// Content script: injeta o hook no MAIN world e escuta as mensagens.
(function () {
  if (window.__rotas66_ifood_content__) return;
  window.__rotas66_ifood_content__ = true;
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
  let scraping = false;

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
    if (msg && msg.type === "rotas66-scrape-dom") {
      const result = scrapeVisibleCatalog();
      sendResponse(result);
      return true;
    }
  });

  function text(el) {
    return (el && el.textContent ? el.textContent : "").replace(/\s+/g, " ").trim();
  }

  function parsePrice(value) {
    const m = String(value || "").match(/R\$\s*([\d.]+,\d{2})/i);
    if (!m) return null;
    const n = Number(m[1].replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  function visible(el) {
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    return r.width > 40 && r.height > 35 && st.visibility !== "hidden" && st.display !== "none";
  }

  function bestProductContainer(priceEl) {
    let cur = priceEl;
    for (let i = 0; i < 7 && cur && cur !== document.body; i++) {
      const imgs = cur.querySelectorAll("img[src]").length;
      const priceCount = (text(cur).match(/R\$\s*[\d.]+,\d{2}/g) || []).length;
      const r = cur.getBoundingClientRect();
      if (imgs && priceCount >= 1 && r.width > 180 && r.height > 80) return cur;
      cur = cur.parentElement;
    }
    return priceEl.parentElement;
  }

  function productFromCard(card, index) {
    const raw = text(card);
    const price = parsePrice(raw);
    if (price == null) return null;
    const pieces = raw.split(/R\$\s*[\d.]+,\d{2}/i)[0]
      .split(/\s{2,}|\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    let nome = "";
    for (const el of card.querySelectorAll("h1,h2,h3,h4,[role='heading'],strong,b,p,span,div")) {
      const t = text(el);
      if (t && !/R\$|buscar|cardápio|categoria|adicionar|comprar/i.test(t) && t.length >= 2 && t.length <= 90) {
        nome = t;
        break;
      }
    }
    if (!nome) nome = pieces[0] || "Produto importado";
    const descricao = pieces.find((p) => p !== nome && p.length > 10 && !/R\$/i.test(p)) || null;
    const img = Array.from(card.querySelectorAll("img[src]"))
      .map((i) => i.currentSrc || i.src)
      .find((src) => src && !/logo|svg|icon|avatar/i.test(src)) || null;
    return { nome, descricao, preco: price, categoria: detectCategory(card), imagem_url: img, ordem: index };
  }

  function detectCategory(card) {
    let prev = card.previousElementSibling;
    for (let i = 0; i < 12 && prev; i++, prev = prev.previousElementSibling) {
      const t = text(prev);
      if (t && t.length <= 80 && !/R\$|buscar|entrega|cupom|sacola/i.test(t)) return t;
    }
    return "Importado do iFood";
  }

  function scrapeVisibleCatalog() {
    if (scraping) return { ok: false, reason: "busy" };
    scraping = true;
    try {
      const priceNodes = Array.from(document.body.querySelectorAll("body *"))
        .filter((el) => {
          if (!visible(el)) return false;
          const t = text(el);
          const matches = t.match(/R\$\s*[\d.]+,\d{2}/g) || [];
          return matches.length > 0 && matches.length <= 2;
        });
      const seen = new Set();
      const produtos = [];
      for (const priceEl of priceNodes) {
        const card = bestProductContainer(priceEl);
        if (!card || seen.has(card)) continue;
        seen.add(card);
        const p = productFromCard(card, produtos.length);
        if (p && !produtos.some((x) => x.nome === p.nome && x.preco === p.preco)) produtos.push(p);
      }
      const categorias = Array.from(new Set(produtos.map((p) => p.categoria).filter(Boolean)));
      return { ok: produtos.length > 0, categorias, produtos };
    } finally {
      scraping = false;
    }
  }
})();
