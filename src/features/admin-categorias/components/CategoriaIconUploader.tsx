import { useRef, useState } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { convertImageToWebpDataUrl } from "@/lib/image-to-webp";

type Props = {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
};

const MAX_BYTES = 200 * 1024; // 200KB
const ALLOWED = ["image/svg+xml", "image/png", "image/webp", "image/jpeg"];

export function CategoriaIconUploader({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(file: File) {
    if (!ALLOWED.includes(file.type)) {
      toast.error("Use SVG, PNG, WEBP ou JPG");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Imagem muito grande (máx 200KB)");
      return;
    }
    setLoading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });
      onChange(dataUrl);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao ler arquivo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="h-12 w-12 grid place-items-center rounded-md bg-black/30 border border-white/10 overflow-hidden shrink-0">
        {value ? (
          <img src={value} alt="" className="h-10 w-10 object-contain" />
        ) : (
          <ImageIcon className="h-5 w-5 text-white/30" />
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".svg,.png,.webp,.jpg,.jpeg,image/svg+xml,image/png,image/webp,image/jpeg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="px-3 py-2 text-xs font-semibold rounded-md bg-white/5 hover:bg-white/10 text-white border border-white/10 flex items-center gap-2 disabled:opacity-50"
      >
        <Upload className="h-3.5 w-3.5" />
        {loading ? "Lendo…" : value ? "Trocar" : "Enviar imagem"}
      </button>
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="h-8 w-8 grid place-items-center rounded-md bg-red-600/20 text-red-300 hover:bg-red-600/40"
          aria-label="Remover"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
