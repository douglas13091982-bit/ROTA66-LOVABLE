// Lê as capturas armazenadas, normaliza para { categorias, produtos } e baixa um JSON.

const IFOOD_IMG_BASE = "https://static-images.ifood.com.br/image/upload/t_high/pratos/";

function priceFromAny(v) {
  if (v == null) return null;
  if (typeof v === "number") return v > 1000 ? v / 100 : v;
  if (typeof v === "object") {
    if (typeof v.value === "number") return v.value > 1000 ? v.value / 100 : v.value;
    if (typeof v.amount === "number") return v.amount > 1000 ? v.amount / 100 : v.amount;
    if (typeof v.price === "number") return v.price > 1000 ? v.price / 100 : v.price;
    if (typeof v.originalPrice === "number") return v.originalPrice > 1000 ? v.originalPrice / 100 : v.originalPrice;
  }
  const n = Number(String(v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}

function imageFromAny(it) {
  const cand =
    it.logoUrl || it.image || it.imageUrl || it.imagePath || it.imageUri ||
    (it.images && (it.images[0]?.path || it.images[0]?.url)) ||
    it.photo || it.foto || it.thumbnail;
  if (!cand) return null;
  if (/^https?:\/\//i.test(cand)) return cand;
  return IFOOD_IMG_BASE + String(cand).replace(/^\/+/, "");
}

function findCategoryArrays(node, out, depth) {
  if (!node || typeof node !== "object" || depth > 12) return;
  if (Array.isArray(node)) {
    const allCat = node.length > 0 && node.every((c) =>
      c && typeof c === "object" &&
      (typeof c.name === "string" || typeof c.title === "string" || typeof c.nome === "string") &&
      Array.isArray(c.items || c.produtos || c.products || c.itens)
    );
    if (allCat) out.push(node);
    node.forEach((n) => findCategoryArrays(n, out, depth + 1));
    return;
  }
  for (const k of Object.keys(node)) findCategoryArrays(node[k], out, depth + 1);
}

function findFlatItems(node, out, depth) {
  if (!node || typeof node !== "object" || depth > 12) return;
  if (Array.isArray(node)) {
    // array de itens "soltos" com nome+preço
    const looksItems = node.length > 0 && node.every((it) =>
      it && typeof it === "object" &&
      (typeof it.name === "string" || typeof it.nome === "string" || typeof it.title === "string") &&
      (it.price != null || it.preco != null || it.unitPrice != null || it.value != null)
    );
    if (looksItems) out.push(node);
    node.forEach((n) => findFlatItems(n, out, depth + 1));
    return;
  }
  for (const k of Object.keys(node)) findFlatItems(node[k], out, depth + 1);
}

function normalize(jsonText) {
  let data;
  try { data = JSON.parse(jsonText); } catch { return null; }
  const cats = [];
  findCategoryArrays(data, cats, 0);
  if (cats.length) {
    cats.sort((a, b) => {
      const sum = (arr) => arr.reduce((s, c) => s + ((c.items || c.produtos || c.products || c.itens || []).length), 0);
      return sum(b) - sum(a);
    });
    const chosen = cats[0];
    const categorias = [];
    const produtos = [];
    let ordem = 0;
    for (const c of chosen) {
      const catNome = (c.name || c.title || c.nome || "").trim() || "Sem categoria";
      if (!categorias.includes(catNome)) categorias.push(catNome);
      const items = c.items || c.produtos || c.products || c.itens || [];
      for (const it of items) {
        const nome = (it.name || it.nome || it.title || "").trim();
        if (!nome) continue;
        const preco = priceFromAny(it.unitPrice ?? it.price ?? it.preco ?? it.value ?? it.originalPrice) ?? 0;
        produtos.push({
          nome,
          descricao: (it.description || it.descricao || it.details || "").trim() || null,
          preco: Number(preco) || 0,
          categoria: catNome,
          imagem_url: imageFromAny(it),
          ordem: ordem++,
        });
      }
    }
    if (produtos.length) return { categorias, produtos };
  }

  // fallback: itens "soltos" sem categoria
  const flats = [];
  findFlatItems(data, flats, 0);
  if (flats.length) {
    flats.sort((a, b) => b.length - a.length);
    const items = flats[0];
    const produtos = items.map((it, i) => {
      const nome = (it.name || it.nome || it.title || "").trim();
      const preco = priceFromAny(it.unitPrice ?? it.price ?? it.preco ?? it.value) ?? 0;
      return {
        nome,
        descricao: (it.description || it.descricao || "").trim() || null,
        preco: Number(preco) || 0,
        categoria: "Importado do iFood",
        imagem_url: imageFromAny(it),
        ordem: i,
      };
    }).filter((p) => p.nome);
    if (produtos.length) return { categorias: ["Importado do iFood"], produtos };
  }
  return null;
}

async function getState() {
  const tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  let onIfood = false;
  if (tab?.url) onIfood = /ifood\.com(\.br)?/i.test(tab.url);
  let captures = [];
  let totalSeen = 0;
  if (tab?.id) {
    try {
      const res = await chrome.tabs.sendMessage(tab.id, { type: "rotas66-get-captures" });
      if (res) {
        captures = res.captures || [];
        totalSeen = res.totalSeen || 0;
      }
    } catch {
      const s = await chrome.storage.local.get(["captures", "totalSeen"]);
      captures = s.captures || [];
      totalSeen = s.totalSeen || 0;
    }
  }
  return { tab, onIfood, captures, totalSeen };
}

async function refresh() {
  const { tab, onIfood, captures, totalSeen } = await getState();
  const stat = document.getElementById("stat");
  const btn = document.getElementById("btn-export");
  const dbg = document.getElementById("dbg");

  dbg.textContent = `Aba: ${tab?.url ? new URL(tab.url).hostname : "—"} | requisições vistas: ${totalSeen} | candidatas: ${captures.length}`;

  if (!onIfood) {
    stat.innerHTML = `<span class="warn">⚠ Abra uma aba do iFood</span><br><span style="color:#888;font-size:11px">Vá em portal.ifood.com.br → Cardápio</span>`;
    btn.disabled = true;
    return;
  }

  let best = null;
  let bestCount = 0;
  for (const c of captures) {
    const norm = normalize(c.body);
    if (norm && norm.produtos.length > bestCount) {
      best = norm;
      bestCount = norm.produtos.length;
    }
  }

  if (best && bestCount > 0) {
    stat.innerHTML = `<span class="ok">✓ Catálogo encontrado</span><br><b>${best.categorias.length}</b> categorias · <b>${bestCount}</b> produtos`;
    btn.disabled = false;
    btn.onclick = () => {
      const blob = new Blob([JSON.stringify(best, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `catalogo-ifood-${stamp}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    };
  } else if (captures.length > 0) {
    stat.innerHTML = `<span class="warn">JSONs capturados, mas nenhum parece o cardápio.</span><br><span style="color:#888;font-size:11px">Vá até a tela <b>Cardápio</b> e role até carregar todos os itens.</span>`;
    btn.disabled = true;
  } else if (totalSeen === 0) {
    stat.innerHTML = `<span class="warn">Nenhuma requisição vista ainda.</span><br><span style="color:#888;font-size:11px">Recarregue a página do iFood (F5) <b>com a extensão já instalada</b>.</span>`;
    btn.disabled = true;
  } else {
    stat.innerHTML = `<span class="warn">Aguardando o cardápio carregar…</span><br><span style="color:#888;font-size:11px">Abra a tela de <b>Cardápio</b> e role até o fim.</span>`;
    btn.disabled = true;
  }
}

document.getElementById("btn-clear").onclick = async () => {
  await chrome.storage.local.set({ captures: [], totalSeen: 0 });
  const tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  if (tab?.id) try { await chrome.tabs.sendMessage(tab.id, { type: "rotas66-clear" }); } catch {}
  refresh();
};

document.getElementById("btn-export-raw").onclick = async () => {
  const { captures } = await getState();
  if (!captures.length) { alert("Nada capturado ainda."); return; }
  const blob = new Blob([JSON.stringify(captures, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `ifood-capturas-brutas-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};

refresh();
setInterval(refresh, 1500);
