import { Download } from "lucide-react";
import type { ApkFile } from "../logic/types";
import { formatSize } from "../logic/helpers";
import { PreviousVersions } from "./PreviousVersions";

interface Props {
  apks: ApkFile[];
  downloading: string | null;
  isAdmin: boolean;
  onDownload: (name: string) => void;
}

export function DownloadSection({ apks, downloading, isAdmin, onDownload }: Props) {
  const latest = apks[0];

  if (!latest) {
    return (
      <div className="text-center text-sm text-muted-foreground py-6 border border-dashed border-border rounded-lg">
        Nenhum APK disponível ainda.
        {isAdmin && <div className="mt-1 text-xs">Envie o primeiro abaixo.</div>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => onDownload(latest.name)}
        disabled={downloading === latest.name}
        className="w-full bg-gradient-red shadow-elevated text-primary-foreground font-display text-xl tracking-[0.1em] py-3.5 rounded-lg hover:shadow-red hover:-translate-y-0.5 transition-all duration-500 ease-premium disabled:opacity-50 flex items-center justify-center gap-3"
      >
        <Download className="h-5 w-5" />
        {downloading === latest.name ? "GERANDO…" : "BAIXAR APK"}
      </button>
      <p className="text-center text-[11px] text-muted-foreground">
        {latest.name} {latest.size ? `· ${formatSize(latest.size)}` : ""}
      </p>
      <PreviousVersions apks={apks.slice(1)} onDownload={onDownload} />
    </div>
  );
}
