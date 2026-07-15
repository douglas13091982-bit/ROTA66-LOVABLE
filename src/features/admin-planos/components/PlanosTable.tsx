import { Pencil, Star, Trash2 } from "lucide-react";
import type { PlanoRow } from "../logic/types";

interface Props {
  planos: PlanoRow[];
  onEdit: (p: PlanoRow) => void;
  onToggleAtivo: (p: PlanoRow) => void;
  onRemove: (id: string) => void;
}

export function PlanosTable({ planos, onEdit, onToggleAtivo, onRemove }: Props) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {planos.map((p) => (
        <div
          key={p.id}
          className={`bg-card border rounded-lg p-4 shadow-card flex flex-col gap-2 ${
            p.destaque ? "border-yellow-500/60" : "border-border"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-bold text-lg flex items-center gap-1.5 truncate">
                {p.destaque && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                {p.nome}
              </div>
              {p.descricao && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.descricao}</p>
              )}
            </div>
            <button
              onClick={() => onRemove(p.id)}
              className="text-muted-foreground hover:text-destructive shrink-0"
              aria-label="Remover"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="text-sm space-y-0.5 pt-1">
            <div>
              Mensalidade:{" "}
              <span className="font-bold text-primary">R$ {Number(p.mensalidade_valor).toFixed(2)}</span>
            </div>
            <div>
              Taxa por pedido:{" "}
              <span className="font-bold">R$ {Number(p.taxa_por_pedido).toFixed(2)}</span>
              {Number(p.taxa_por_pedido) === 0 && (
                <span className="ml-1 text-xs text-green-500">(isento)</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Vence dia {p.dia_vencimento} · ordem {p.ordem}
            </div>
            <div className="text-xs text-muted-foreground">
              Limite pedidos/mês:{" "}
              <span className="font-semibold text-foreground">
                {p.max_pedidos_mes && p.max_pedidos_mes > 0 ? p.max_pedidos_mes : "Ilimitado"}
              </span>
            </div>

          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <button
              onClick={() => onToggleAtivo(p)}
              className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded ${
                p.ativo ? "bg-green-600/20 text-green-500" : "bg-zinc-600/20 text-zinc-400"
              }`}
            >
              {p.ativo ? "Ativo" : "Inativo"}
            </button>
            <button
              onClick={() => onEdit(p)}
              className="ml-auto inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border border-border hover:bg-background"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </button>
          </div>
        </div>
      ))}
      {planos.length === 0 && (
        <div className="col-span-full text-center p-8 text-muted-foreground">
          Nenhum plano cadastrado ainda.
        </div>
      )}
    </div>
  );
}
