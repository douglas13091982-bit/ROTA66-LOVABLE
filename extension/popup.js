// Lê as capturas armazenadas, normaliza para { categorias, produtos } e baixa um JSON.

const IFOOD_IMG_BASE = "https://static-images.ifood.com.br/image/upload/t_high/pratos/";

function priceFromAny(v) {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof v === "object") {
    if (typeof v.value === "number") return v.value;
    if (typeof v.amount === "number") return v.amount / (v.amount > 1000 ? 100 : 1);
    if (typeof v.price === "number") return v.price;
  }
  const n = Number(String(v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}

function imageFromAny(it) {
  const cand = it.logoUrl || it.image || it.imageUrl || it.imagePath || it.imageUri ||
               (it.images && (it.images[0]?.path || it.images[0]?.url)) ||
               it.photo || it.foto;
  if (!cand) return null;
  if (/^https?:\/\//i.test(cand)) return cand;
  return IFOOD_IMG_BASE + String(cand).replace(/^\/+/, "");
}

// Procura recursivamente arrays de categorias com items/produtos
function findCategoryArrays(node, out) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    // Heurística: array onde cada item tem name + (items|produtos|products)
    const allCat = node.length > 0 && node.every((c) =>
      c && typeof c === "object" &&
      (typeof c.name === "string" || typeof c.title === "string" || typeof c.nome === "string") &&
      Array.isArray(c.items || c.produtos || c.products || c.itens)
    );
    if (allCat) out.push(node);
    node.forEach((n) => findCategoryArrays(n, out));
    return;
  }
  for (const k of Object.keys(node)) findCategoryArrays(node[k], out);
}

function normalize(jsonText) {
  let data;
  try { data = JSON.parse(jsonText); } catch { return null; }
  const found = [];
  findCategoryArrays(data, found);
  if (!found.length) return null;
  // pega o array com mais itens totais
  found.sort((a, b) => {
    const sum = (arr) => arr.reduce((s, c) => s + ((c.items || c.produtos || c.products || c.itens || []).length), 0);
    return sum(b) - sum(a);
  });
  const cats = found[0];
  const categorias = [];
  const produtos = [];
  let ordem = 0;
  for (const c of cats) {
    const catNome = (c.name || c.title || c.nome || "").trim() || "Sem categoria";
    if (!categorias.includes(catNome)) categorias.push(catNome);
    const items = c.items || c.produtos || c.products || c.itens || [];
    for (const it of items) {
      const nome = (it.name || it.nome || it.title || "").trim();
      if (!nome) continue;
      const preco = priceFromAny(it.unitPrice || it.price || it.preco || it.value) ?? 0;
      const descricao = (it.description || it.descricao || it.details || "").trim() || null;
      const imagem_url = imageFromAny(it);
      produtos.push({
        nome,
        descricao,
        preco: Number(preco) || 0,
        categoria: catNome,
        imagem_url,
        ordem: ordem++,
      });
    }
  }
  return { categorias, produtos };
}

async function getCaptures() {
  const tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  if (!tab?.id) return [];
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: "rotas66-get-captures" });
    return Array.isArray(res) ? res : [];
  } catch {
    const s = await chrome.storage.local.get(["captures"]);
    return s.captures || [];
  }
}

async function refresh() {
  const caps = await getCaptures();
  let best = null;
  let bestCount = 0;
  for (const c of caps) {
    const norm = normalize(c.body);
    if (norm && norm.produtos.length > bestCount) {
      best = norm;
      bestCount = norm.produtos.length;
    }
  }
  const stat = document.getElementById("stat");
  const btn = document.getElementById("btn-export");
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
  } else {
    stat.innerHTML = `<span class="warn">Aguardando captura…</span><br><span style="color:#888;font-size:11px">Abra o Cardápio no portal do iFood e role a página até carregar tudo.</span>`;
    btn.disabled = true;
  }
}

document.getElementById("btn-clear").onclick = async () => {
  await chrome.storage.local.set({ captures: [] });
  const tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  if (tab?.id) try { await chrome.tabs.sendMessage(tab.id, { type: "rotas66-clear" }); } catch {}
  refresh();
};

refresh();
setInterval(refresh, 1500);
