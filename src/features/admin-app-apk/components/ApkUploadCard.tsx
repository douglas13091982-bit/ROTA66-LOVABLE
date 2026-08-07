import { Smartphone, Upload } from "lucide-react";

type Props = {
  uploading: boolean;
  onUpload: (file: File | null) => void;
};

export function ApkUploadCard({ uploading, onUpload }: Props) {
  return (
    <div className="bg-white border border-[#e2e6ec] p-6" style={{ boxShadow: "0 10px 30px -12px rgba(15,27,45,0.25)" }}>
      <div className="flex items-start gap-4 mb-5">
        <div className="h-12 w-12 bg-[#e3000f] flex items-center justify-center shrink-0">
          <Smartphone className="h-6 w-6" style={{ color: "#ffffff" }} />
        </div>
        <div>
          <h2 className="font-display text-xl tracking-wide text-[#0f1b2d]">Hospedagem do aplicativo</h2>
          <p className="text-sm text-[#5a6675] mt-1">
            Envie novas versões do APK. A versão mais recente aparece como destaque em{" "}
            <span className="font-bold text-[#0f1b2d]">/baixar-app</span>.
          </p>
        </div>
      </div>

      <label className="block">
        <div className="flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-[#c3cad6] cursor-pointer hover:border-[#e3000f] transition-colors text-[#0f1b2d]">
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
      <p className="text-[11px] text-[#5a6675] mt-2">
        Se um arquivo com o mesmo nome já existir, ele será substituído.
      </p>
    </div>
  );
}
