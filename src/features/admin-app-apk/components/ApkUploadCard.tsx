import { Smartphone, Upload } from "lucide-react";

type Props = {
  uploading: boolean;
  onUpload: (file: File | null) => void;
};

export function ApkUploadCard({ uploading, onUpload }: Props) {
  return (
    <div className="glass-strong border border-border/60 rounded-xl p-6">
      <div className="flex items-start gap-4 mb-5">
        <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Smartphone className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl tracking-wide">Hospedagem do aplicativo</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Envie novas versões do APK. A versão mais recente aparece como destaque em{" "}
            <span className="font-bold">/baixar-app</span>.
          </p>
        </div>
      </div>

      <label className="block">
        <div className="flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/60 transition-colors">
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
          onChange={(e) => {
            onUpload(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
      </label>
      <p className="text-[11px] text-muted-foreground mt-2">
        Se um arquivo com o mesmo nome já existir, ele será substituído.
      </p>
    </div>
  );
}
