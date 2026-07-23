import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Download, FileSpreadsheet, Upload, AlertCircle, CheckCircle2 } from "lucide-react";

// xlsx é ~150 KB gzip. Import dinâmico mantém fora do bundle da rota de
// produtos até o lojista realmente abrir "Importar em massa".
const loadXLSX = () => import("xlsx");

type LinhaImport = {
  nome: string;
  descricao: string | null;
  preco: number;
  categoria: string | null;
  ativo: boolean;
  ordem: number;
  _erros: string[];
  _linha: number;
};

const COLUNAS = ["nome", "descricao", "preco", "categoria", "ativo", "ordem"] as const;

const EXEMPLO = [
  { nome: "X-Burger", descricao: "Pão, hambúrguer, queijo", preco: 18.9, categoria: "Lanches", ativo: "sim", ordem: 1 },
  { nome: "Coca-Cola 350ml", descricao: "Lata gelada", preco: 6, categoria: "Bebidas", ativo: "sim", ordem: 2 },
  { nome: "Batata Frita G", descricao: "Porção 300g", preco: 22.5, categoria: "Acompanhamentos", ativo: "sim", ordem: 3 },
];

function baixarModelo(formato: "csv" | "xlsx") {
  const ws = XLSX.utils.json_to_sheet(EXEMPLO, { header: COLUNAS as unknown as string[] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Produtos");
  if (formato === "csv") {
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "modelo-produtos.csv"; a.click();
    URL.revokeObjectURL(url);
  } else {
    XLSX.writeFile(wb, "modelo-produtos.xlsx");
  }
}

function parseBool(v: any): boolean {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  if (["", "sim", "s", "true", "1", "ativo", "yes", "y"].includes(s)) return true;
  if (["nao", "não", "n", "false", "0", "inativo", "no"].includes(s)) return false;
  return true;
}

function parsePreco(v: any): number {
  if (typeof v === "number") return v;
  const s = String(v ?? "").trim().replace(/r\$\s*/i, "").replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return isNaN(n) ? NaN : n;
}

function validar(linhas: any[]): LinhaImport[] {
  return linhas.map((row, idx) => {
    const erros: string[] = [];
    const nome = String(row.nome ?? "").trim();
    if (!nome) erros.push("nome obrigatório");
    if (nome.length > 120) erros.push("nome > 120 caracteres");

    const preco = parsePreco(row.preco);
    if (isNaN(preco)) erros.push("preço inválido");
    else if (preco < 0) erros.push("preço negativo");

    const descricao = String(row.descricao ?? "").trim();
    if (descricao.length > 500) erros.push("descrição > 500 caracteres");

    const categoria = String(row.categoria ?? "").trim();

    return {
      nome,
      descricao: descricao || null,
      preco: isNaN(preco) ? 0 : preco,
      categoria: categoria || null,
      ativo: parseBool(row.ativo),
      ordem: Number(row.ordem) || 0,
      _erros: erros,
      _linha: idx + 2,
    };
  });
}

export function ImportarProdutosDialog({ lojaId, onImported, children }: {
  lojaId: string;
  onImported: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [linhas, setLinhas] = useState<LinhaImport[] | null>(null);
  const [arquivo, setArquivo] = useState<string>("");
  const [importando, setImportando] = useState(false);

  function reset() {
    setLinhas(null); setArquivo(""); setImportando(false);
  }

  async function handleArquivo(file: File) {
    setArquivo(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });
      if (!json.length) {
        toast.error("Planilha vazia");
        return;
      }
      const headers = Object.keys(json[0] ?? {}).map((h) => h.toLowerCase().trim());
      if (!headers.includes("nome") || !headers.includes("preco")) {
        toast.error("Planilha precisa conter as colunas 'nome' e 'preco'");
        return;
      }
      // normaliza chaves para lowercase
      const norm = json.map((r) => {
        const out: any = {};
        for (const k of Object.keys(r)) out[k.toLowerCase().trim()] = r[k];
        return out;
      });
      setLinhas(validar(norm));
    } catch (e: any) {
      toast.error("Erro ao ler arquivo: " + (e?.message ?? "desconhecido"));
    }
  }

  async function confirmar() {
    if (!linhas) return;
    const validas = linhas.filter((l) => l._erros.length === 0);
    if (!validas.length) return toast.error("Nenhuma linha válida para importar");

    setImportando(true);
    const payload = validas.map((l) => ({
      loja_id: lojaId,
      nome: l.nome,
      descricao: l.descricao,
      preco: l.preco,
      categoria: l.categoria,
      ativo: l.ativo,
      ordem: l.ordem,
    }));

    // inserir em lotes de 500
    let inseridos = 0;
    for (let i = 0; i < payload.length; i += 500) {
      const lote = payload.slice(i, i + 500);
      const { error } = await (supabase as any).from("produtos").insert(lote);
      if (error) {
        setImportando(false);
        return toast.error("Erro: " + error.message);
      }
      inseridos += lote.length;
    }
    setImportando(false);
    toast.success(`${inseridos} produto${inseridos === 1 ? "" : "s"} importado${inseridos === 1 ? "" : "s"}`);
    onImported();
    setOpen(false);
    reset();
  }

  const totalErros = linhas?.filter((l) => l._erros.length > 0).length ?? 0;
  const totalValidas = linhas?.filter((l) => l._erros.length === 0).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar produtos em massa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="bg-background/50 border border-border rounded-md p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              1. Baixe o modelo
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Preencha no Excel ou Google Sheets. Colunas: <code className="text-foreground">nome, descricao, preco, categoria, ativo, ordem</code>. Apenas <code className="text-foreground">nome</code> e <code className="text-foreground">preco</code> são obrigatórios.
            </p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => baixarModelo("xlsx")} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary rounded-md hover:bg-primary/20">
                <Download className="h-3.5 w-3.5" /> Modelo Excel
              </button>
              <button onClick={() => baixarModelo("csv")} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider bg-card border border-border rounded-md hover:bg-background">
                <Download className="h-3.5 w-3.5" /> Modelo CSV
              </button>
            </div>
          </div>

          <div className="bg-background/50 border border-border rounded-md p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              2. Envie a planilha preenchida
            </p>
            <label className="flex items-center justify-center gap-2 px-3 py-4 bg-background border border-dashed border-border rounded-md text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground cursor-pointer">
              <Upload className="h-4 w-4" />
              {arquivo || "Selecionar arquivo (.csv ou .xlsx)"}
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleArquivo(f);
                  e.target.value = "";
                }}
              />
            </label>
            <p className="text-[10px] text-muted-foreground mt-2">
              As fotos não são importadas em massa — adicione depois produto a produto.
            </p>
          </div>

          {linhas && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-600/10 text-green-500 font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {totalValidas} válidas
                </span>
                {totalErros > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-600/10 text-red-400 font-bold">
                    <AlertCircle className="h-3.5 w-3.5" /> {totalErros} com erro
                  </span>
                )}
              </div>

              <div className="border border-border rounded-md overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-background sticky top-0">
                    <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="px-2 py-1.5 w-10">#</th>
                      <th className="px-2 py-1.5">Nome</th>
                      <th className="px-2 py-1.5 w-20">Preço</th>
                      <th className="px-2 py-1.5">Categoria</th>
                      <th className="px-2 py-1.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {linhas.slice(0, 50).map((l) => (
                      <tr key={l._linha} className={l._erros.length ? "bg-red-600/5" : ""}>
                        <td className="px-2 py-1.5 text-muted-foreground">{l._linha}</td>
                        <td className="px-2 py-1.5 truncate max-w-[200px]">{l.nome || <span className="text-red-400">—</span>}</td>
                        <td className="px-2 py-1.5">R$ {l.preco.toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{l.categoria || "—"}</td>
                        <td className="px-2 py-1.5">
                          {l._erros.length ? (
                            <span className="text-red-400 text-[10px]">{l._erros.join(", ")}</span>
                          ) : (
                            <span className="text-green-500 text-[10px]">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {linhas.length > 50 && (
                  <div className="px-2 py-1.5 text-[10px] text-muted-foreground bg-background border-t border-border">
                    Mostrando 50 de {linhas.length} linhas. Todas serão importadas.
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={reset} className="px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-md bg-card border border-border hover:bg-background">
                  Cancelar
                </button>
                <button
                  onClick={confirmar}
                  disabled={importando || totalValidas === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md bg-gradient-red shadow-red text-primary-foreground disabled:opacity-50"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  {importando ? "Importando..." : `Importar ${totalValidas} produto${totalValidas === 1 ? "" : "s"}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
