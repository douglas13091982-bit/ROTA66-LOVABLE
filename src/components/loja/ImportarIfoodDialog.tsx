import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, ShoppingBag, AlertCircle, CheckCircle2, Link2, Loader2, ExternalLink } from "lucide-react";
import { importarCatalogoIfood, extrairCatalogoIfoodPorUrl } from "@/lib/importar-ifood.functions";

type ProdutoJson = {
  nome: string;
  descricao?: string | null;
  preco: number;
  categoria?: string | null;
  imagem_url?: string | null;
  ordem?: number;
};

type CatalogoJson = {
  categorias?: string[];
  produtos: ProdutoJson[];
};

function precoDe(it: any): number {
  const cands = [it?.preco, it?.price, it?.minPrice, it?.unitPrice, it?.originalPrice, it?.promotionalPrice];
  for (const v of cands) {
    if (typeof v === "number" && isFinite(v) && v >= 0) return v;
    if (typeof v === "string") {
      const n = Number(v.replace(/[^\d,.-]/g, "").replace(",", "."));
      if (isFinite(n) && n >= 0) return n;
    }
    if (v && typeof v === "object" && typeof v.value === "number") {
      return v.value > 1000 ? v.value / 100 : v.value;
    }
  }
  return NaN;
}

function imagemDe(it: any): string | null {
  const c = it?.imagem_url ?? it?.image ?? it?.imageUrl ?? it?.logoUrl ?? it?.imagePath;
  if (!c) return null;
  if (typeof c !== "string") return null;
  if (/^https?:\/\//i.test(c)) return c;
  return "https://static-images.ifood.com.br/image/upload/t_high/pratos/" + c.replace(/^\/+/, "");
}

/** Aceita o formato simples {categorias, produtos} ou o JSON cru do iFood PDP. */
function extrairCatalogo(json: any): { produtos: ProdutoJson[]; categorias: string[] } {
  // formato simples
  if (Array.isArray(json?.produtos)) {
    const lista = (json.produtos as any[])
      .map((p) => ({
        nome: String(p?.nome ?? "").trim(),
        descricao: p?.descricao ?? null,
        preco: typeof p?.preco === "number" ? p.preco : precoDe(p),
        categoria: p?.categoria ?? null,
        imagem_url: imagemDe(p),
        ordem: typeof p?.ordem === "number" ? p.ordem : undefined,
      }))
      .filter((p) => p.nome && isFinite(p.preco));
    const cats = Array.isArray(json.categorias) && json.categorias.length
      ? json.categorias
      : Array.from(new Set(lista.map((p) => p.categoria).filter(Boolean) as string[]));
    return { produtos: lista, categorias: cats };
  }

  // procura recursivamente um array "menu" com {name, items[]}
  const menus: any[] = [];
  (function walk(node: any, depth = 0) {
    if (!node || typeof node !== "object" || depth > 10) return;
    if (Array.isArray(node)) {
      const ok = node.length > 0 && node.every((c) => c && typeof c === "object"
        && (typeof c.name === "string" || typeof c.title === "string" || typeof c.nome === "string")
        && Array.isArray(c.items || c.itens || c.products || c.produtos));
      if (ok) menus.push(node);
      node.forEach((n) => walk(n, depth + 1));
      return;
    }
    for (const k of Object.keys(node)) walk(node[k], depth + 1);
  })(json);

  if (!menus.length) return { produtos: [], categorias: [] };
  menus.sort((a, b) => {
    const sum = (arr: any[]) => arr.reduce((s, c) => s + ((c.items || c.itens || c.products || c.produtos || []).length), 0);
    return sum(b) - sum(a);
  });
  const chosen = menus[0];
  const produtos: ProdutoJson[] = [];
  const cats: string[] = [];
  let ordem = 0;
  for (const cat of chosen) {
    const catNome = String(cat?.name ?? cat?.title ?? cat?.nome ?? "Sem categoria").trim();
    if (catNome && !cats.includes(catNome)) cats.push(catNome);
    const items = cat.items || cat.itens || cat.products || cat.produtos || [];
    for (const it of items) {
      const nome = String(it?.name ?? it?.nome ?? it?.title ?? "").trim();
      const preco = precoDe(it);
      if (!nome || !isFinite(preco)) continue;
      produtos.push({
        nome,
        descricao: (it?.description ?? it?.descricao ?? "").toString().trim() || null,
        preco,
        categoria: catNome,
        imagem_url: imagemDe(it),
        ordem: ordem++,
      });
    }
  }
  return { produtos, categorias: cats };
}


export function ImportarIfoodDialog({
  lojaId,
  onImported,
  children,
}: {
  lojaId: string;
  onImported: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [modo, setModo] = useState<"url" | "arquivo">("url");
  const [url, setUrl] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [arquivo, setArquivo] = useState<string>("");
  const [produtos, setProdutos] = useState<ProdutoJson[] | null>(null);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const importar = useServerFn(importarCatalogoIfood);
  const extrairPorUrl = useServerFn(extrairCatalogoIfoodPorUrl);

  function reset() {
    setUrl("");
    setArquivo("");
    setProdutos(null);
    setCategorias([]);
    setErro(null);
    setImportando(false);
    setBuscando(false);
  }

  async function handleArquivo(file: File) {
    setArquivo(file.name);
    setErro(null);
    setProdutos(null);
    try {
      const txt = await file.text();
      const json = JSON.parse(txt);
      const { produtos: lista, categorias: cats } = extrairCatalogo(json);
      if (!lista.length) {
        setErro("Nenhum produto encontrado no JSON.");
        return;
      }
      setProdutos(lista);
      setCategorias(cats);
    } catch (e: any) {
      setErro("JSON inválido: " + (e?.message ?? "desconhecido"));
    }
  }

  async function handleUrl() {
    const u = url.trim();
    if (!u) {
      setErro("Informe a URL do restaurante no iFood.");
      return;
    }
    setErro(null);
    setProdutos(null);
    setBuscando(true);
    try {
      const json = await extrairPorUrl({ data: { loja_id: lojaId, url: u } });
      const { produtos: lista, categorias: cats } = extrairCatalogo(json);
      if (!lista.length) {
        setErro("Nenhum produto encontrado para essa URL.");
        return;
      }
      setProdutos(lista);
      setCategorias(cats);
    } catch (e: any) {
      setErro("Erro ao extrair: " + (e?.message ?? "desconhecido"));
    } finally {
      setBuscando(false);
    }
  }


  async function confirmar() {
    if (!produtos?.length) return;
    setImportando(true);
    try {
      const res = await importar({
        data: {
          loja_id: lojaId,
          produtos: produtos.map((p, i) => ({
            nome: String(p.nome).trim(),
            descricao: p.descricao ? String(p.descricao).trim() : null,
            preco: Number(p.preco) || 0,
            categoria: p.categoria ? String(p.categoria).trim() : null,
            imagem_url: p.imagem_url ? String(p.imagem_url) : null,
            ordem: typeof p.ordem === "number" ? p.ordem : i,
          })),
        },
      });
      toast.success(
        `${res.total} produtos importados (${res.com_imagem} com imagem, ${res.sem_imagem} sem)`
      );
      onImported();
      setOpen(false);
      reset();
    } catch (e: any) {
      toast.error("Erro ao importar: " + (e?.message ?? "desconhecido"));
    } finally {
      setImportando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" /> Importar catálogo do iFood
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-2 text-xs text-foreground">
          <ExternalLink className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
          <div>
            Integração via{" "}
            <a
              href="https://geckoapi.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline text-primary hover:text-primary/80"
            >
              GeckoAPI
            </a>
            . Clique para acessar o painel, pegar sua URL do iFood e importar.
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex gap-1 p-1 bg-background border border-border rounded-md text-[11px] font-bold uppercase tracking-wider">
            <button
              onClick={() => { setModo("url"); setErro(null); }}
              className={`flex-1 px-3 py-1.5 rounded-sm transition ${modo === "url" ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Link2 className="h-3 w-3 inline mr-1" /> Por URL
            </button>
            <button
              onClick={() => { setModo("arquivo"); setErro(null); }}
              className={`flex-1 px-3 py-1.5 rounded-sm transition ${modo === "arquivo" ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Upload className="h-3 w-3 inline mr-1" /> Por arquivo JSON
            </button>
          </div>

          {modo === "url" ? (
            <div className="bg-background/50 border border-border rounded-md p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                URL do restaurante no iFood
              </p>
              <p className="text-[11px] text-muted-foreground mb-3">
                Cole a URL pública do restaurante (ex.: <code className="text-foreground">https://www.ifood.com.br/delivery/cidade-uf/nome-do-restaurante/...</code>).
                <br /><b className="text-amber-400">Atenção:</b> os produtos atuais da loja serão substituídos.
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.ifood.com.br/delivery/..."
                  className="flex-1 px-3 py-2 text-xs bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                  disabled={buscando}
                />
                <button
                  onClick={handleUrl}
                  disabled={buscando || !url.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-md bg-gradient-red shadow-red text-primary-foreground disabled:opacity-50"
                >
                  {buscando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                  {buscando ? "Buscando..." : "Buscar"}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-background/50 border border-border rounded-md p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Envie o JSON aqui
              </p>
              <p className="text-[11px] text-muted-foreground mb-3">
                Selecione o arquivo <code className="text-foreground">.json</code> com a estrutura
                <code className="text-foreground ml-1">{`{ "categorias": [...], "produtos": [...] }`}</code>.
                <br />Cada produto precisa ter ao menos <code className="text-foreground">nome</code> e <code className="text-foreground">preco</code>.
                <br /><b className="text-amber-400">Atenção:</b> os produtos atuais da loja serão substituídos.
              </p>
              <label className="flex items-center justify-center gap-2 px-3 py-4 bg-background border border-dashed border-border rounded-md text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground cursor-pointer">
                <Upload className="h-4 w-4" />
                {arquivo || "Selecionar arquivo .json"}
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleArquivo(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          )}

          {erro && (
            <div className="flex items-start gap-2 text-xs text-red-400 bg-red-600/10 border border-red-600/20 rounded-md p-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {produtos && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-600/10 text-green-500 font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {produtos.length} produtos
                </span>
                {categorias.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-card border border-border text-muted-foreground font-bold">
                    {categorias.length} categorias
                  </span>
                )}
              </div>

              <div className="border border-border rounded-md overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-background sticky top-0">
                    <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="px-2 py-1.5">Nome</th>
                      <th className="px-2 py-1.5 w-20">Preço</th>
                      <th className="px-2 py-1.5">Categoria</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {produtos.slice(0, 50).map((p, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1.5 truncate max-w-[200px]">{p.nome}</td>
                        <td className="px-2 py-1.5">R$ {Number(p.preco).toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{p.categoria || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {produtos.length > 50 && (
                  <div className="px-2 py-1.5 text-[10px] text-muted-foreground bg-background border-t border-border">
                    Mostrando 50 de {produtos.length}. Todos serão importados.
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={reset}
                  className="px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-md bg-card border border-border hover:bg-background"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmar}
                  disabled={importando}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md bg-gradient-red shadow-red text-primary-foreground disabled:opacity-50"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  {importando ? "Importando..." : `Importar ${produtos.length}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
