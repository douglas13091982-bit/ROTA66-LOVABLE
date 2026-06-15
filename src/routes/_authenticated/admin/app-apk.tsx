import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { toast } from "sonner";
import { Download, Upload, Trash2, Smartphone, FileDown, RefreshCw } from "lucide-react";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/app-apk")({
  head: () => ({ meta: [{ title: "App APK — Admin" }] }),
  component: AdminAppApkPage,
});

interface ApkFile {
  name: string;
  updated_at: string;
  size: number;
}

function formatSize(bytes: number) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

const formatDate = (s: string) => formatDateTime(s);

function AdminAppApkPage() {
  const [apks, setApks] = useState<ApkFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyName, setBusyName] = useState<string | null>(null);

  const loadApks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.storage
      .from("apks")
      .list("", { limit: 100, sortBy: { column: "updated_at", order: "desc" } });
    if (error) {
      toast.error("Erro ao listar APKs: " + error.message);
      setApks([]);
    } else {
      setApks(
        (data ?? [])
          .filter((f) => f.name.toLowerCase().endsWith(".apk"))
          .map((f) => ({
            name: f.name,
            updated_at: f.updated_at ?? f.created_at ?? "",
            size: (f.metadata as any)?.size ?? 0,
          })),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadApks();
  }, [loadApks]);

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".apk")) {
      toast.error("Envie um arquivo .apk");
      return;
    }
    setUploading(true);
    const { error } = await supabase.storage
      .from("apks")
      .upload(file.name, file, {
        upsert: true,
        contentType: "application/vnd.android.package-archive",
      });
    setUploading(false);
    if (error) {
      toast.error("Falha no upload: " + error.message);
      return;
    }
    toast.success("APK enviado!");
    void loadApks();
  };

  const handleDownload = async (name: string) => {
    setBusyName(name);
    try {
      const { data, error } = await supabase.storage
        .from("apks")
        .createSignedUrl(name, 60 * 10, { download: name });
      if (error || !data?.signedUrl) throw error ?? new Error("Sem URL");
      window.location.href = data.signedUrl;
    } catch (err: any) {
      toast.error("Falha ao gerar link: " + (err?.message ?? "erro"));
    } finally {
      setTimeout(() => setBusyName(null), 1500);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Remover "${name}"? Esta ação não pode ser desfeita.`)) return;
    setBusyName(name);
    const { error } = await supabase.storage.from("apks").remove([name]);
    setBusyName(null);
    if (error) {
      toast.error("Falha ao remover: " + error.message);
      return;
    }
    toast.success("APK removido");
    void loadApks();
  };

  return (
    <AdminShell title="App APK">
      <div className="max-w-4xl space-y-6">
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
                handleUpload(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </label>
          <p className="text-[11px] text-muted-foreground mt-2">
            Se um arquivo com o mesmo nome já existir, ele será substituído.
          </p>
        </div>

        <div className="glass-strong border border-border/60 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg tracking-wide">Versões hospedadas</h3>
            <button
              onClick={() => void loadApks()}
              className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary inline-flex items-center gap-1"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Atualizar
            </button>
          </div>

          {loading ? (
            <div className="text-center text-sm text-muted-foreground py-6">Carregando…</div>
          ) : apks.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8 border border-dashed border-border rounded-lg">
              Nenhum APK enviado ainda.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {apks.map((a, i) => (
                <li key={a.name} className="py-3 flex items-center gap-3">
                  <FileDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate flex items-center gap-2">
                      {a.name}
                      {i === 0 && (
                        <span className="text-[9px] px-2 py-0.5 bg-primary/15 text-primary rounded-full uppercase tracking-widest font-bold">
                          mais recente
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {a.size ? formatSize(a.size) : "—"} · {formatDate(a.updated_at)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(a.name)}
                    disabled={busyName === a.name}
                    className="p-2 rounded-md hover:bg-card/60 text-muted-foreground hover:text-primary disabled:opacity-50"
                    title="Baixar"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(a.name)}
                    disabled={busyName === a.name}
                    className="p-2 rounded-md hover:bg-card/60 text-muted-foreground hover:text-destructive disabled:opacity-50"
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
