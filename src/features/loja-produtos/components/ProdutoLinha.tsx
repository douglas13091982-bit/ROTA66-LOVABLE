import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { useProdutoActions } from "../hooks/use-produto-actions";
import type { Produto } from "../logic/types";
import { ProdutoDialog } from "./ProdutoDialog";

export function ProdutoLinha({
  produto: p,
  lojaId,
  onChanged,
}: {
  produto: Produto;
  lojaId: string;
  onChanged: () => void;
}) {
  const { toggleAtivo, remove } = useProdutoActions(p, onChanged);

  return (
    <div className="flex items-center gap-3 p-3 hover:bg-background/50 transition">
      <div className="h-14 w-14 shrink-0 rounded-md overflow-hidden bg-background border border-border">
        {p.imagem_signed_url ? (
          <img src={p.imagem_signed_url} alt={p.nome} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground">
            Sem foto
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm truncate">{p.nome}</h3>
          {!p.ativo && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-amber-600/20 text-amber-500">
              Inativo
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {p.categoria && (
            <span className="font-bold uppercase tracking-wider">{p.categoria}</span>
          )}
          {p.descricao && <span className="truncate">· {p.descricao}</span>}
        </div>
      </div>
      <div className="font-display text-base text-primary shrink-0 w-24 text-right">
        R$ {Number(p.preco).toFixed(2)}
      </div>
      <div className="flex gap-1 shrink-0">
        <ProdutoDialog lojaId={lojaId} produto={p} onSaved={onChanged}>
          <button
            className="flex items-center justify-center px-2 py-1.5 text-[10px] rounded-md bg-primary/10 text-primary hover:bg-primary/20"
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </ProdutoDialog>
        <button
          onClick={toggleAtivo}
          className="flex items-center justify-center px-2 py-1.5 rounded-md bg-card border border-border hover:bg-background"
          title={p.ativo ? "Desativar" : "Ativar"}
        >
          {p.ativo ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={remove}
          className="flex items-center justify-center px-2 py-1.5 rounded-md bg-red-600/20 text-red-400 hover:bg-red-600/30"
          title="Excluir"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
