import { CheckCircle2, Send, Trash2, XCircle } from "lucide-react";
import { useTurnoActions } from "../hooks/use-turno-actions";
import type { TurnoRow } from "../logic/types";

export function TurnoActions({ t, onChange }: { t: TurnoRow; onChange: () => void }) {
  const { busy, publicar, cancelar, concluir, excluir } = useTurnoActions(t.id, onChange);

  return (
    <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
      {t.status === "rascunho" && (
        <>
          <button
            onClick={publicar}
            disabled={busy}
            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider rounded-md hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Send className="h-3.5 w-3.5" /> Publicar para entregadores
          </button>
          <button
            onClick={excluir}
            disabled={busy}
            className="px-3 py-1.5 bg-zinc-700 text-zinc-100 text-xs font-bold uppercase tracking-wider rounded-md hover:bg-zinc-600 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" /> Excluir
          </button>
        </>
      )}
      {(t.status === "publicado" || t.status === "aceito") && (
        <button
          onClick={cancelar}
          disabled={busy}
          className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold uppercase tracking-wider rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5"
        >
          <XCircle className="h-3.5 w-3.5" /> Cancelar
        </button>
      )}
      {t.status === "aceito" && (
        <button
          onClick={concluir}
          disabled={busy}
          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold uppercase tracking-wider rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Marcar concluído
        </button>
      )}
      {(t.status === "concluido" || t.status === "cancelado") && (
        <button
          onClick={excluir}
          disabled={busy}
          className="px-3 py-1.5 bg-zinc-700 text-zinc-100 text-xs font-bold uppercase tracking-wider rounded-md hover:bg-zinc-600 disabled:opacity-50 flex items-center gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </button>
      )}
    </div>
  );
}
