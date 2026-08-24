import { Trash2, Clock } from "lucide-react";
import { anuncioExpirado, diasRestantes, type AnuncioRow } from "../logic/types";
import { formatDate } from "@/lib/format";

type Props = {
  anuncio: AnuncioRow;
  onToggle: (id: string, ativo: boolean) => void;
  onPrazo: (id: string, dias: number | null) => void;
  onDelete: (id: string) => void;
};

const OPCOES: Array<{ v: number | null; l: string }> = [
  { v: 7, l: "7 dias" },
  { v: 15, l: "15 dias" },
  { v: 30, l: "30 dias" },
  { v: 60, l: "60 dias" },
  { v: 90, l: "90 dias" },
  { v: null, l: "Sem prazo" },
];

export function AnuncioCard({ anuncio: a, onToggle, onPrazo, onDelete }: Props) {
  const expirado = anuncioExpirado(a.expira_em);
  const dias = diasRestantes(a.expira_em);

  return (
    <div className="bg-card border border-border rounded-lg p-4 flex gap-4 items-start">
      <img
        src={a.image_data_url}
        alt={a.titulo ?? ""}
        className={`w-32 h-20 object-cover rounded ${expirado ? "opacity-40" : ""}`}
      />
      <div className="flex-1 min-w-0">
        <div className="font-bold truncate">{a.titulo || "(sem título)"}</div>
        {a.link_url && (
          <div className="text-xs text-muted-foreground truncate">{a.link_url}</div>
        )}

        <div className="mt-1.5 flex items-center gap-1.5 text-xs">
          <Clock className="h-3 w-3 text-muted-foreground" />
          {!a.expira_em ? (
            <span className="text-muted-foreground">Sem prazo de expiração</span>
          ) : expirado ? (
            <span className="text-red-400 font-bold">Expirado</span>
          ) : (
            <span className="text-muted-foreground">
              Expira em {dias} dia{dias === 1 ? "" : "s"} (
              {formatDate(a.expira_em)})
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-2 items-center">
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

          <select
            value={String(dias == null ? "" : "")}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") return;
              onPrazo(a.id, raw === "null" ? null : Number(raw));
              e.target.value = "";
            }}
            className="px-2 py-1 text-xs bg-background border border-border rounded-md"
          >
            <option value="">Renovar prazo…</option>
            {OPCOES.map((o) => (
              <option key={o.l} value={o.v === null ? "null" : String(o.v)}>
                {o.v === null ? "Sem prazo" : `+${o.l}`}
              </option>
            ))}
          </select>

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
