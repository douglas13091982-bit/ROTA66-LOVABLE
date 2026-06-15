import { FileDown } from "lucide-react";
import type { ApkFile } from "../logic/types";

interface Props {
  apks: ApkFile[];
  onDownload: (name: string) => void;
}

export function PreviousVersions({ apks, onDownload }: Props) {
  if (apks.length === 0) return null;
  return (
    <details className="mt-4">
      <summary className="text-xs font-bold uppercase tracking-widest text-muted-foreground cursor-pointer">
        Versões anteriores ({apks.length})
      </summary>
      <ul className="mt-3 space-y-2">
        {apks.map((a) => (
          <li key={a.name} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate">{a.name}</span>
            <button
              onClick={() => onDownload(a.name)}
              className="text-primary hover:underline inline-flex items-center gap-1 shrink-0"
            >
              <FileDown className="h-3.5 w-3.5" /> baixar
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
