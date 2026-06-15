import { Download, FileDown, Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { formatSize } from "../logic/helpers";
import type { ApkFile } from "../logic/types";

type Props = {
  apk: ApkFile;
  isLatest: boolean;
  busy: boolean;
  onDownload: (name: string) => void;
  onDelete: (name: string) => void;
};

export function ApkListItem({ apk: a, isLatest, busy, onDownload, onDelete }: Props) {
  return (
    <li className="py-3 flex items-center gap-3">
      <FileDown className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-bold truncate flex items-center gap-2">
          {a.name}
          {isLatest && (
            <span className="text-[9px] px-2 py-0.5 bg-primary/15 text-primary rounded-full uppercase tracking-widest font-bold">
              mais recente
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {a.size ? formatSize(a.size) : "—"} · {formatDateTime(a.updated_at)}
        </div>
      </div>
      <button
        onClick={() => onDownload(a.name)}
        disabled={busy}
        className="p-2 rounded-md hover:bg-card/60 text-muted-foreground hover:text-primary disabled:opacity-50"
        title="Baixar"
      >
        <Download className="h-4 w-4" />
      </button>
      <button
        onClick={() => onDelete(a.name)}
        disabled={busy}
        className="p-2 rounded-md hover:bg-card/60 text-muted-foreground hover:text-destructive disabled:opacity-50"
        title="Remover"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}
