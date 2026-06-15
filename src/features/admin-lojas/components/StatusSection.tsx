import { Ban, Check, Trash2 } from "lucide-react";

type Props = {
  status: string;
  onAprovar: () => void;
  onBloquear: () => void;
  onRemover: () => void;
};

export function StatusSection({ status, onAprovar, onBloquear, onRemover }: Props) {
  return (
    <section>
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
        Status da loja
      </h3>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onAprovar}
          disabled={status === "aprovado"}
          className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-bold uppercase rounded-md bg-green-600/20 text-green-500 hover:bg-green-600/30 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Check className="h-3.5 w-3.5" /> Aprovar
        </button>
        <button
          onClick={onBloquear}
          disabled={status === "bloqueado"}
          className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-bold uppercase rounded-md bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Ban className="h-3.5 w-3.5" /> Bloquear
        </button>
        <button
          onClick={onRemover}
          className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-bold uppercase rounded-md bg-red-600/20 text-red-400 hover:bg-red-600/30"
        >
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </button>
      </div>
    </section>
  );
}
