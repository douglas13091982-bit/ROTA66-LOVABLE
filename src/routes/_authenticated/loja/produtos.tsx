import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { LojaShell } from "@/components/LojaShell";
import { useMinhaLoja } from "@/hooks/use-loja";
import { supabase } from "@/integrations/supabase/client";
import { withProdutoSignedSidecar } from "@/lib/produto-image";
import { Plus, Pencil, Trash2, Upload, ExternalLink, Eye, EyeOff, LayoutGrid, List, Search, FileSpreadsheet } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImportarProdutosDialog } from "@/components/loja/ImportarProdutosDialog";

export const Route = createFileRoute("/_authenticated/loja/produtos")({
  component: ProdutosPage,
});

type Produto = {
  id: string;
  loja_id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  imagem_url: string | null;
  imagem_signed_url?: string | null;
  categoria: string | null;
  ativo: boolean;
  ordem: number;
};

function ProdutosPage() {
  const { data: loja } = useMinhaLoja();
  const qc = useQueryClient();
  const [view, setView] = useState<"cards" | "lista">(() => {
    if (typeof window === "undefined") return "cards";
    return (localStorage.getItem("loja:produtos:view") as "cards" | "lista") || "cards";
  });
  function setViewPersist(v: "cards" | "lista") {
    setView(v);
    try { localStorage.setItem("loja:produtos:view", v); } catch {}
  }

  const [search, setSearch] = useState("");

  const { data: produtos, isLoading } = useQuery({
    queryKey: ["produtos", loja?.id],
    enabled: !!loja?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos" as any)
        .select("*")
        .eq("loja_id", loja!.id)
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return await withProdutoSignedSidecar(data as unknown as Produto[]);
    },
  });

  if (!loja) {
    return (
      <LojaShell title="Catálogo">
        <p className="text-muted-foreground">Crie sua loja primeiro no Dashboard.</p>
      </LojaShell>
    );
  }

  const catalogoAtivo = (loja as any).catalogo_ativo === true;
  const catalogoUrl = loja
    ? `${window.location.origin}/c/${(loja as any).catalogo_slug ?? loja.slug}`
    : "";

  return (
    <LojaShell title="Catálogo">
      <div className="mb-6 flex flex-wrap gap-3 items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground max-w-xl">
            Cadastre os produtos que aparecem no seu catálogo público. O catálogo só fica visível quando o super admin ativa para sua loja.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${catalogoAtivo ? "bg-green-600/20 text-green-500" : "bg-amber-600/20 text-amber-400"}`}>
              {catalogoAtivo ? "Catálogo ativo" : "Aguardando ativação"}
            </span>
            {catalogoAtivo && (
              <a href={catalogoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                <ExternalLink className="h-3 w-3" /> ver catálogo público
              </a>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ImportarProdutosDialog lojaId={loja.id} onImported={() => qc.invalidateQueries({ queryKey: ["produtos", loja.id] })}>
            <button className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-foreground rounded-md font-bold uppercase text-xs tracking-wider hover:bg-background">
              <FileSpreadsheet className="h-4 w-4" /> Importar planilha
            </button>
          </ImportarProdutosDialog>
          <ProdutoDialog lojaId={loja.id} onSaved={() => qc.invalidateQueries({ queryKey: ["produtos", loja.id] })}>
            <button className="flex items-center gap-2 px-4 py-2 bg-gradient-red shadow-red text-primary-foreground rounded-md font-bold uppercase text-xs tracking-wider hover:opacity-90">
              <Plus className="h-4 w-4" /> Novo produto
            </button>
          </ProdutoDialog>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-background border border-border rounded-md text-sm w-64"
          />
        </div>
        <div className="inline-flex rounded-md border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setViewPersist("cards")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${view === "cards" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Cards
          </button>
          <button
            type="button"
            onClick={() => setViewPersist("lista")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider border-l border-border ${view === "lista" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}
          >
            <List className="h-3.5 w-3.5" /> Lista
          </button>
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      {(() => {
        const filtered = (produtos ?? []).filter((p) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          return (
            p.nome.toLowerCase().includes(q) ||
            (p.categoria ?? "").toLowerCase().includes(q) ||
            (p.descricao ?? "").toLowerCase().includes(q)
          );
        });

        if (!isLoading && filtered.length === 0 && search.trim()) {
          return <p className="text-center text-muted-foreground py-8">Nenhum produto encontrado para "{search.trim()}".</p>;
        }

        if (view === "cards") {
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {filtered.map((p) => (
                <ProdutoCard key={p.id} produto={p} lojaId={loja.id} onChanged={() => qc.invalidateQueries({ queryKey: ["produtos", loja.id] })} />
              ))}
              {!isLoading && filtered.length === 0 && (
                <p className="col-span-full text-center text-muted-foreground py-8">Nenhum produto cadastrado ainda.</p>
              )}
            </div>
          );
        }

        return (
          <div className="bg-card border border-border rounded-lg overflow-hidden divide-y divide-border">
            {filtered.map((p) => (
              <ProdutoLinha key={p.id} produto={p} lojaId={loja.id} onChanged={() => qc.invalidateQueries({ queryKey: ["produtos", loja.id] })} />
            ))}
            {!isLoading && filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nenhum produto cadastrado ainda.</p>
            )}
          </div>
        );
      })()}
    </LojaShell>
  );
}

function ProdutoCard({ produto: p, lojaId, onChanged }: { produto: Produto; lojaId: string; onChanged: () => void }) {
  async function toggleAtivo() {
    const { error } = await (supabase as any).from("produtos").update({ ativo: !p.ativo }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(!p.ativo ? "Produto ativado" : "Produto desativado");
    onChanged();
  }

  async function remove() {
    if (!confirm(`Excluir "${p.nome}"?`)) return;
    const { error } = await supabase.from("produtos" as any).delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Produto excluído");
    onChanged();
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-card flex flex-col">
      <div className="aspect-[4/3] bg-background relative">
        {p.imagem_signed_url ? (
          <img src={p.imagem_signed_url} alt={p.nome} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">Sem imagem</div>
        )}
        {!p.ativo && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md bg-amber-600/80 text-white">Inativo</div>
        )}
      </div>
      <div className="p-2.5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-1 mb-0.5">
          <h3 className="font-bold text-xs truncate">{p.nome}</h3>
          <div className="font-display text-sm text-primary shrink-0">R$ {Number(p.preco).toFixed(2)}</div>
        </div>
        {p.categoria && <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{p.categoria}</div>}
        {p.descricao && <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">{p.descricao}</p>}
        <div className="mt-auto flex gap-1">
          <ProdutoDialog lojaId={lojaId} produto={p} onSaved={onChanged}>
            <button className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1 text-[10px] font-bold uppercase rounded-md bg-primary/10 text-primary hover:bg-primary/20">
              <Pencil className="h-3 w-3" /> Editar
            </button>
          </ProdutoDialog>
          <button onClick={toggleAtivo} className="flex items-center justify-center px-1.5 py-1 text-[10px] rounded-md bg-card border border-border hover:bg-background" title={p.ativo ? "Desativar" : "Ativar"}>
            {p.ativo ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
          <button onClick={remove} className="flex items-center justify-center px-1.5 py-1 text-[10px] rounded-md bg-red-600/20 text-red-400 hover:bg-red-600/30" title="Excluir">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ProdutoLinha({ produto: p, lojaId, onChanged }: { produto: Produto; lojaId: string; onChanged: () => void }) {
  async function toggleAtivo() {
    const { error } = await (supabase as any).from("produtos").update({ ativo: !p.ativo }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(!p.ativo ? "Produto ativado" : "Produto desativado");
    onChanged();
  }
  async function remove() {
    if (!confirm(`Excluir "${p.nome}"?`)) return;
    const { error } = await supabase.from("produtos" as any).delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Produto excluído");
    onChanged();
  }
  return (
    <div className="flex items-center gap-3 p-3 hover:bg-background/50 transition">
      <div className="h-14 w-14 shrink-0 rounded-md overflow-hidden bg-background border border-border">
        {p.imagem_signed_url ? (
          <img src={p.imagem_signed_url} alt={p.nome} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground">Sem foto</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm truncate">{p.nome}</h3>
          {!p.ativo && <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-amber-600/20 text-amber-500">Inativo</span>}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {p.categoria && <span className="font-bold uppercase tracking-wider">{p.categoria}</span>}
          {p.descricao && <span className="truncate">· {p.descricao}</span>}
        </div>
      </div>
      <div className="font-display text-base text-primary shrink-0 w-24 text-right">R$ {Number(p.preco).toFixed(2)}</div>
      <div className="flex gap-1 shrink-0">
        <ProdutoDialog lojaId={lojaId} produto={p} onSaved={onChanged}>
          <button className="flex items-center justify-center px-2 py-1.5 text-[10px] rounded-md bg-primary/10 text-primary hover:bg-primary/20" title="Editar">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </ProdutoDialog>
        <button onClick={toggleAtivo} className="flex items-center justify-center px-2 py-1.5 rounded-md bg-card border border-border hover:bg-background" title={p.ativo ? "Desativar" : "Ativar"}>
          {p.ativo ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
        <button onClick={remove} className="flex items-center justify-center px-2 py-1.5 rounded-md bg-red-600/20 text-red-400 hover:bg-red-600/30" title="Excluir">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}



function ProdutoDialog({ lojaId, produto, onSaved, children }: { lojaId: string; produto?: Produto; onSaved: () => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nome: produto?.nome ?? "",
    descricao: produto?.descricao ?? "",
    preco: produto ? String(produto.preco) : "",
    categoria: produto?.categoria ?? "",
    imagem_url: produto?.imagem_url ?? "",
    ordem: produto?.ordem ?? 0,
  });
  const [preview, setPreview] = useState<string>(produto?.imagem_signed_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${lojaId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("produtos").upload(path, file, { upsert: false });
    if (upErr) {
      setUploading(false);
      return toast.error(upErr.message);
    }
    const { data: signed } = await supabase.storage.from("produtos").createSignedUrl(path, 60 * 60);
    setForm((f) => ({ ...f, imagem_url: path }));
    setPreview(signed?.signedUrl ?? "");
    setUploading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim() || !form.preco) return toast.error("Nome e preço são obrigatórios");
    setSaving(true);
    const payload: any = {
      loja_id: lojaId,
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      preco: Number(form.preco),
      categoria: form.categoria.trim() || null,
      imagem_url: form.imagem_url || null,
      ordem: Number(form.ordem) || 0,
    };
    const { error } = produto
      ? await (supabase as any).from("produtos").update(payload).eq("id", produto.id)
      : await (supabase as any).from("produtos").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(produto ? "Produto atualizado" : "Produto criado");
    onSaved();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{produto ? "Editar produto" : "Novo produto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-3 pt-2">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome</span>
            <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required maxLength={120}
              className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-md text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Preço (R$)</span>
              <input type="number" step="0.01" min="0" value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} required
                className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-md text-sm" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categoria</span>
              <input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} maxLength={50}
                className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-md text-sm" />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição</span>
            <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} maxLength={500} rows={3}
              className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-md text-sm" />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Imagem</span>
            <div className="mt-1 flex items-center gap-3">
              {preview && <img src={preview} alt="" className="h-16 w-16 object-cover rounded-md border border-border" />}
              <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-background border border-dashed border-border rounded-md text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground cursor-pointer">
                <Upload className="h-3.5 w-3.5" />
                {uploading ? "Enviando..." : form.imagem_url ? "Trocar" : "Enviar imagem"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0]; if (f) handleUpload(f);
                }} />
              </label>
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ordem</span>
            <input type="number" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })}
              className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-md text-sm" />
            <span className="text-[10px] text-muted-foreground">Menor número aparece primeiro.</span>
          </label>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="flex-1 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md border border-border hover:bg-background">
              Cancelar
            </button>
            <button type="submit" disabled={saving || uploading} className="flex-1 px-4 py-2 bg-gradient-red shadow-red text-primary-foreground rounded-md text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-40">
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
