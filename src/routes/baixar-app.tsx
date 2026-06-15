import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Download, Upload, Smartphone, ArrowRight, FileDown } from "lucide-react";
import { AuthCard, PrimaryButton } from "@/components/AuthCard";

export const Route = createFileRoute("/baixar-app")({
  head: () => ({
    meta: [
      { title: "Baixar o app — ROTA 66" },
      { name: "description", content: "Baixe o aplicativo para entregadores ROTA 66 direto no seu celular." },
    ],
  }),
  component: BaixarAppPage,
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

function BaixarAppPage() {
  const { user, hasRole, loading: authLoading } = useAuth();
  const isAdmin = hasRole("super_admin");
  const [apks, setApks] = useState<ApkFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadApks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.storage
      .from("apks")
      .list("", { limit: 50, sortBy: { column: "updated_at", order: "desc" } });
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
    if (!authLoading) void loadApks();
  }, [authLoading, loadApks]);

  const handleDownload = async (name: string) => {
    setDownloading(name);
    try {
      const { data, error } = await supabase.storage
        .from("apks")
        .createSignedUrl(name, 60 * 10, { download: name });
      if (error || !data?.signedUrl) throw error ?? new Error("Sem URL");
      window.location.href = data.signedUrl;
    } catch (err: any) {
      toast.error("Falha ao gerar link: " + (err?.message ?? "erro"));
    } finally {
      setTimeout(() => setDownloading(null), 1500);
    }
  };

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".apk")) {
      toast.error("Envie um arquivo .apk");
      return;
    }
    setUploading(true);
    const path = file.name;
    const { error } = await supabase.storage
      .from("apks")
      .upload(path, file, { upsert: true, contentType: "application/vnd.android.package-archive" });
    setUploading(false);
    if (error) {
      toast.error("Falha no upload: " + error.message);
      return;
    }
    toast.success("APK enviado!");
    void loadApks();
  };

  const latest = apks[0];

  return (
    <AuthCard
      title="BAIXE O APP"
      subtitle="Instale o aplicativo ROTA 66 direto no seu celular Android"
      footer={
        user ? (
          <Link to="/entregador" className="text-primary font-bold hover:underline inline-flex items-center gap-1">
            Ir para o painel <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <Link to="/login" className="text-primary font-bold hover:underline">
            Entrar
          </Link>
        )
      }
    >
      <div className="flex flex-col items-center mb-6">
        <div className="h-20 w-20 rounded-2xl bg-primary/15 flex items-center justify-center mb-4">
          <Smartphone className="h-10 w-10 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground text-center leading-relaxed">
          Após baixar, abra o arquivo no celular e libere a instalação de fontes desconhecidas se solicitado.
        </p>
      </div>

      {loading ? (
        <div className="text-center text-sm text-muted-foreground py-6">Carregando…</div>
      ) : latest ? (
        <div className="space-y-3">
          <button
            onClick={() => handleDownload(latest.name)}
            disabled={downloading === latest.name}
            className="w-full bg-gradient-red shadow-elevated text-primary-foreground font-display text-xl tracking-[0.1em] py-3.5 rounded-lg hover:shadow-red hover:-translate-y-0.5 transition-all duration-500 ease-premium disabled:opacity-50 flex items-center justify-center gap-3"
          >
            <Download className="h-5 w-5" />
            {downloading === latest.name ? "GERANDO…" : "BAIXAR APK"}
          </button>
          <p className="text-center text-[11px] text-muted-foreground">
            {latest.name} {latest.size ? `· ${formatSize(latest.size)}` : ""}
          </p>

          {apks.length > 1 && (
            <details className="mt-4">
              <summary className="text-xs font-bold uppercase tracking-widest text-muted-foreground cursor-pointer">
                Versões anteriores ({apks.length - 1})
              </summary>
              <ul className="mt-3 space-y-2">
                {apks.slice(1).map((a) => (
                  <li key={a.name} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{a.name}</span>
                    <button
                      onClick={() => handleDownload(a.name)}
                      className="text-primary hover:underline inline-flex items-center gap-1 shrink-0"
                    >
                      <FileDown className="h-3.5 w-3.5" /> baixar
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      ) : (
        <div className="text-center text-sm text-muted-foreground py-6 border border-dashed border-border rounded-lg">
          Nenhum APK disponível ainda.
          {isAdmin && <div className="mt-1 text-xs">Envie o primeiro abaixo.</div>}
        </div>
      )}

      {isAdmin && (
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
              onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      )}
    </AuthCard>
  );
}
