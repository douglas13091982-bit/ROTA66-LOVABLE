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
    <div className="mx-3 mt-2 mb-1 rounded-xl border border-yellow-400/40 bg-yellow-500/10 px-3 py-2.5 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-yellow-700 dark:text-yellow-300">
          Nova versão do app disponível
        </div>
        <div className="text-[11px] text-neutral-600 dark:text-white/60 truncate">
          Atualize para {latest}
        </div>
      </div>
      <button
        onClick={handleDownload}
        disabled={busy}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-50"
      >
        <Download className="h-3.5 w-3.5" />
        {busy ? "…" : "Baixar"}
      </button>
    </div>
  );
}
