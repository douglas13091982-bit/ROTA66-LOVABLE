import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { useProdutoActions } from "../hooks/use-produto-actions";
import type { Produto } from "../logic/types";
import { ProdutoDialog } from "./ProdutoDialog";

export function ProdutoCard({
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
    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-card flex flex-col">
      <div className="aspect-[4/3] bg-background relative">
        {p.imagem_signed_url ? (
          <img src={p.imagem_signed_url} alt={p.nome} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">
            Sem imagem
          </div>
        )}
        {!p.ativo && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md bg-amber-600/80 text-white">
            Inativo
          </div>
        )}
      </div>
      <div className="p-2.5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-1 mb-0.5">
          <h3 className="font-bold text-xs truncate">{p.nome}</h3>
          <div className="font-display text-sm text-primary shrink-0">
            R$ {Number(p.preco).toFixed(2)}
          </div>
        </div>
        {p.categoria && (
          <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            {p.categoria}
          </div>
        )}
        {p.descricao && (
          <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">{p.descricao}</p>
        )}
        <div className="mt-auto flex gap-1">
          <ProdutoDialog lojaId={lojaId} produto={p} onSaved={onChanged}>
            <button className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1 text-[10px] font-bold uppercase rounded-md bg-primary/10 text-primary hover:bg-primary/20">
              <Pencil className="h-3 w-3" /> Editar
            </button>
          </ProdutoDialog>
          <button
            onClick={toggleAtivo}
            className="flex items-center justify-center px-1.5 py-1 text-[10px] rounded-md bg-card border border-border hover:bg-background"
            title={p.ativo ? "Desativar" : "Ativar"}
          >
            {p.ativo ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
          <button
            onClick={remove}
            className="flex items-center justify-center px-1.5 py-1 text-[10px] rounded-md bg-red-600/20 text-red-400 hover:bg-red-600/30"
            title="Excluir"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
