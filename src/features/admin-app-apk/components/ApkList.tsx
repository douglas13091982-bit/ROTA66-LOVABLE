import { RefreshCw } from "lucide-react";
import { ApkListItem } from "./ApkListItem";
import type { ApkFile } from "../logic/types";

type Props = {
  apks: ApkFile[];
  loading: boolean;
  busyName: string | null;
  onRefresh: () => void;
  onDownload: (name: string) => void;
  onDelete: (name: string) => void;
};

export function ApkList({ apks, loading, busyName, onRefresh, onDownload, onDelete }: Props) {
  return (
    <div className="glass-strong border border-border/60 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg tracking-wide">Versões hospedadas</h3>
        <button
          onClick={onRefresh}
          className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary inline-flex items-center gap-1"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="text-center text-sm text-muted-foreground py-6">Carregando…</div>
      ) : apks.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-8 border border-dashed border-border rounded-lg">
          Nenhum APK enviado ainda.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {apks.map((a, i) => (
            <ApkListItem
              key={a.name}
              apk={a}
              isLatest={i === 0}
              busy={busyName === a.name}
              onDownload={onDownload}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
