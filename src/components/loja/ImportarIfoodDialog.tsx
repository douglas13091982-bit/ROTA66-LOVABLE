import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Download, Upload, AlertTriangle, CheckCircle2 } from "lucide-react";
import { importarCatalogoIfood } from "@/lib/importar-ifood.functions";

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

function baixarExtensao() {
  fetch("/extensao-ifood.zip")
    .then((res) => {
      if (!res.ok) throw new Error("Falha ao baixar extensão");
      return res.blob();
    })
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "rotas66-extensao-ifood.zip";
      a.click();
      URL.revokeObjectURL(a.href);
    })
    .catch((e) => toast.error(e.message));
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
  const [arquivo, setArquivo] = useState<string>("");
  const [json, setJson] = useState<CatalogoJson | null>(null);
  const [importando, setImportando] = useState(false);
  const importar = useServerFn(importarCatalogoIfood);

  function reset() {
    setArquivo("");
    setJson(null);
    setImportando(false);
  }

  async function handleArquivo(f: File) {
    setArquivo(f.name);
    try {
      const txt = await f.text();
      const parsed = JSON.parse(txt);
      if (!parsed || !Array.isArray(parsed.produtos) || parsed.produtos.length === 0) {
        toast.error("JSON inválido: precisa ter 'produtos' (array).");
        setJson(null);
        return;
      }
      setJson(parsed);
    } catch (e: any) {
      toast.error("Não consegui ler o arquivo: " + (e?.message ?? "desconhecido"));
      setJson(null);
    }
  }

  async function confirmar() {
    if (!json) return;
    setImportando(true);
    try {
      const res = await importar({
        data: {
          loja_id: lojaId,
          produtos: json.produtos.map((p, i) => ({
            nome: String(p.nome ?? "").trim(),
            descricao: p.descricao ? String(p.descricao) : null,
            preco: Number(p.preco) || 0,
            categoria: p.categoria ? String(p.categoria) : null,
            imagem_url: p.imagem_url ? String(p.imagem_url) : null,
            ordem: typeof p.ordem === "number" ? p.ordem : i,
          })),
        },
      });
      toast.success(
        `Importação concluída: ${res.total} produtos (${res.com_imagem} com foto, ${res.sem_imagem} sem foto).`,
      );
      onImported();
      setOpen(false);
      reset();
    } catch (e: any) {
      toast.error("Erro: " + (e?.message ?? "desconhecido"));
    } finally {
      setImportando(false);
    }
  }

  const total = json?.produtos.length ?? 0;
  const comImg = json?.produtos.filter((p) => !!p.imagem_url).length ?? 0;
  const cats = json?.categorias?.length ?? new Set(json?.produtos.map((p) => p.categoria).filter(Boolean)).size;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar catálogo do iFood</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="bg-background/50 border border-border rounded-md p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              1. Instale a extensão do Chrome
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Baixe o ZIP, descompacte, abra <code className="text-foreground">chrome://extensions</code>, ative o <b>Modo desenvolvedor</b> e clique em <b>Carregar sem compactação</b> apontando para a pasta.
            </p>
            <button
              onClick={baixarExtensao}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary rounded-md hover:bg-primary/20"
            >
              <Download className="h-3.5 w-3.5" /> Baixar extensão (.zip)
            </button>
          </div>

          <div className="bg-background/50 border border-border rounded-md p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              2. Exporte o catálogo no iFood
            </p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-4">
              <li>Entre no Portal do Parceiro iFood com sua loja.</li>
              <li>Abra a tela de <b>Cardápio</b> e role até carregar todos os produtos.</li>
              <li>Clique no ícone da extensão e em <b>Exportar JSON</b>.</li>
            </ol>
          </div>

          <div className="bg-background/50 border border-border rounded-md p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              3. Envie o JSON aqui
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

          {json && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-600/10 text-green-500 font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {total} produtos
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-card border border-border font-bold">
                  {cats} categorias
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-card border border-border font-bold">
                  {comImg} com foto
                </span>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <b>Atenção:</b> ao confirmar, <b>todo o catálogo atual desta loja será apagado</b> e substituído pelos produtos do JSON. As imagens serão baixadas do iFood e salvas no nosso armazenamento.
                </div>
              </div>

              <div className="flex justify-end gap-2">
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
                  {importando ? "Importando..." : `Substituir e importar ${total}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
