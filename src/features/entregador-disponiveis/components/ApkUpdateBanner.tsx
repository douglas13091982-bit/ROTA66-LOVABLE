import { useEffect, useState } from "react";
import { Download, Smartphone, ArrowRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STORAGE_KEY = "rota66:apk-baixado";

export function ApkUpdateBanner() {
  const [latest, setLatest] = useState<string | null>(null);
  const [baixado, setBaixado] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

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

  if (dismissed || !latest || baixado === latest) return null;

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
    <button
      onClick={handleDownload}
      disabled={busy}
      className="relative w-full flex items-center justify-between gap-4 p-4 rounded-2xl bg-[#1a2b4b]/90 backdrop-blur-md border border-white/10 shadow-xl text-left"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#AE0000] flex items-center justify-center">
          <Smartphone className="h-5 w-5 text-white" />
        </div>
        <div className="text-left">
          <p className="text-sm font-black text-white uppercase tracking-tight">Nova Versão Disponível</p>
          <p className="text-[11px] text-white/60 font-medium">Toque para baixar o novo APK {latest.replace(".apk", "")}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <ArrowRight className="h-5 w-5 text-white/40" />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setDismissed(true);
          }}
          className="p-1 hover:bg-white/10 rounded-full"
        >
          <X className="w-4 h-4 text-white/20" />
        </button>
      </div>
    </button>
  );
}
