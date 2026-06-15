import { Trash2 } from "lucide-react";
import type { AnuncioRow } from "../logic/types";

type Props = {
  anuncio: AnuncioRow;
  onToggle: (id: string, ativo: boolean) => void;
  onDelete: (id: string) => void;
};

export function AnuncioCard({ anuncio: a, onToggle, onDelete }: Props) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex gap-4 items-start">
      <img
        src={a.image_data_url}
        alt={a.titulo ?? ""}
        className="w-32 h-20 object-cover rounded"
      />
      <div className="flex-1 min-w-0">
        <div className="font-bold truncate">{a.titulo || "(sem título)"}</div>
        {a.link_url && (
          <div className="text-xs text-muted-foreground truncate">{a.link_url}</div>
        )}
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => onToggle(a.id, a.ativo)}
            className={`px-3 py-1 text-xs font-bold rounded-md ${
              a.ativo
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {a.ativo ? "Ativo" : "Inativo"}
          </button>
          <button
            onClick={() => onDelete(a.id)}
            className="px-3 py-1 text-xs font-bold rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center gap-1"
          >
            <Trash2 className="h-3 w-3" /> Excluir
          </button>
        </div>
      </div>
    </div>
  );
}
