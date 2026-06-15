import { Upload } from "lucide-react";

interface Props {
  uploading: boolean;
  onUpload: (file: File | null) => void;
}

export function AdminUpload({ uploading, onUpload }: Props) {
  return (
    <div className="mt-8 pt-6 border-t border-border">
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
        Admin · Enviar nova versão
      </div>
      <label className="block">
        <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/60 transition-colors">
          <Upload className="h-4 w-4" />
          <span className="text-sm font-bold uppercase tracking-wider">
            {uploading ? "Enviando…" : "Selecionar arquivo .apk"}
          </span>
        </div>
        <input
          type="file"
          accept=".apk,application/vnd.android.package-archive"
          className="hidden"
          disabled={uploading}
          onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}
