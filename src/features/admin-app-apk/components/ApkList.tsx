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
    <div className="bg-white border border-[#e2e6ec] p-6" style={{ boxShadow: "0 10px 30px -12px rgba(15,27,45,0.25)" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg tracking-wide text-[#0f1b2d]">Versões hospedadas</h3>
        <button
          onClick={onRefresh}
          className="text-xs font-bold uppercase tracking-widest text-[#AE0000] hover:text-[#8a0000] inline-flex items-center gap-1"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="text-center text-sm text-[#5a6675] py-6">Carregando…</div>
      ) : apks.length === 0 ? (
        <div className="text-center text-sm text-[#5a6675] py-8 border border-dashed border-[#c3cad6]">
          Nenhum APK enviado ainda.
        </div>
      ) : (
        <ul className="divide-y divide-[#e2e6ec]">
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
