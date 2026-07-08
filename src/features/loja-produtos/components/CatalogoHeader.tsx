import { ExternalLink, FileSpreadsheet, Plus, ShoppingBag, Trash2, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ImportarProdutosDialog } from "@/components/loja/ImportarProdutosDialog";
import { ImportarIfoodDialog } from "@/components/loja/ImportarIfoodDialog";
import { ProdutoDialog } from "./ProdutoDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function CatalogoHeader({
  lojaId,
  catalogoAtivo,
  catalogoUrl,
}: {
  lojaId: string;
  catalogoAtivo: boolean;
  catalogoUrl: string;
}) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["produtos", lojaId] });
  const [excluindo, setExcluindo] = useState(false);

  async function excluirTodos() {
    setExcluindo(true);
    try {
      const { error, count } = await (supabase as any)
        .from("produtos")
        .delete({ count: "exact" })
        .eq("loja_id", lojaId);
      if (error) throw error;
      toast.success(`${count ?? 0} produto(s) excluído(s)`);
      invalidate();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao excluir produtos");
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div className="mb-6 flex flex-wrap gap-3 items-start justify-between">
      <div>
        <p className="text-sm text-muted-foreground max-w-xl">
          Cadastre os produtos que aparecem no seu catálogo público. O catálogo só fica visível
          quando o super admin ativa para sua loja.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${
              catalogoAtivo
                ? "bg-green-600/20 text-green-500"
                : "bg-amber-600/20 text-amber-400"
            }`}
          >
            {catalogoAtivo ? "Catálogo ativo" : "Aguardando ativação"}
          </span>
          {catalogoAtivo && (
            <a
              href={catalogoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> ver catálogo público
            </a>
          )}
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        <ImportarIfoodDialog lojaId={lojaId} onImported={invalidate}>
          <button className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-foreground rounded-md font-bold uppercase text-xs tracking-wider hover:bg-background">
            <ShoppingBag className="h-4 w-4" /> Importar do iFood
          </button>
        </ImportarIfoodDialog>
        <ImportarProdutosDialog lojaId={lojaId} onImported={invalidate}>
          <button className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-foreground rounded-md font-bold uppercase text-xs tracking-wider hover:bg-background">
            <FileSpreadsheet className="h-4 w-4" /> Importar planilha
          </button>
        </ImportarProdutosDialog>
        <ProdutoDialog lojaId={lojaId} onSaved={invalidate}>
          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-red shadow-red text-primary-foreground rounded-md font-bold uppercase text-xs tracking-wider hover:opacity-90">
            <Plus className="h-4 w-4" /> Novo produto
          </button>
        </ProdutoDialog>
      </div>
    </div>
  );
}
