import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ApkFile } from "../logic/types";

export function useApks() {
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
    const { error } = await supabase.storage.from("apks").upload(file.name, file, {
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

  return {
    apks,
    loading,
    uploading,
    busyName,
    loadApks,
    handleUpload,
    handleDownload,
    handleDelete,
  };
}
