import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STORAGE_KEY = "rota66:apk-baixado";

export function ApkUpdateBanner() {
  const [latest, setLatest] = useState<string | null>(null);
  const [baixado, setBaixado] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      setBaixado(localStorage.getItem(STORAGE_KEY));
    } catch {
      /* noop */
    }
    (async () => {
      const { data, error } = await supabase.storage
        .from("apks")
        .list("", { limit: 20, sortBy: { column: "updated_at", order: "desc" } });
      if (error) return;
      const apk = (data ?? []).find((f) => f.name.toLowerCase().endsWith(".apk"));
      if (apk) setLatest(apk.name);
    })();
  }, []);

  if (!latest || baixado === latest) return null;

  const handleDownload = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.storage
        .from("apks")
        .createSignedUrl(latest, 60 * 10, { download: latest });
      if (error || !data?.signedUrl) throw error ?? new Error("Sem URL");
      try {
        localStorage.setItem(STORAGE_KEY, latest);
      } catch {
        /* noop */
      }
      setBaixado(latest);
      window.location.href = data.signedUrl;
    } catch (err: any) {
      toast.error("Falha ao baixar: " + (err?.message ?? "erro"));
    } finally {
      setTimeout(() => setBusy(false), 1500);
    }
  };

  return (
    <div className="mx-3 mt-2 mb-1 rounded-2xl border border-[#0d2c54]/20 bg-[#0d2c54] p-4 flex items-center gap-4 shadow-lg shadow-[#0d2c54]/10">
      <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
        <Download className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-black text-white uppercase tracking-wider">
          Nova versão disponível
        </div>
        <div className="text-[11px] text-white/60 truncate uppercase tracking-widest mt-0.5">
          {latest}
        </div>
      </div>
      <button
        onClick={handleDownload}
        disabled={busy}
        className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-[#AE0000] px-4 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-white disabled:opacity-50 shadow-lg shadow-[#AE0000]/20 active:scale-95 transition-transform"
      >
        <Download className="h-3.5 w-3.5" />
        {busy ? "…" : "Baixar"}
      </button>
    </div>
  );
}
