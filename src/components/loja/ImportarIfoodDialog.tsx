import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, ShoppingBag, AlertCircle, CheckCircle2 } from "lucide-react";
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
  const [produtos, setProdutos] = useState<ProdutoJson[] | null>(null);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const importar = useServerFn(importarCatalogoIfood);

  function reset() {
    setArquivo("");
    setProdutos(null);
    setCategorias([]);
    setErro(null);
    setImportando(false);
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

        <div className="space-y-4 pt-2">
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
