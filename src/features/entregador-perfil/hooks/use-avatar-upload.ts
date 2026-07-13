import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { convertImageToWebp } from "@/lib/image-to-webp";

type AvatarEvent = "upload_ok" | "upload_fail" | "rls_denied" | "validation_failed";

async function logAvatarEvent(
  event: AvatarEvent,
  extra: {
    storage_path?: string;
    mime_type?: string;
    size_bytes?: number;
    error_code?: string;
    error_message?: string;
  } = {},
) {
  try {
    await supabase.rpc("log_avatar_event" as any, {
      _event: event,
      _storage_path: extra.storage_path ?? null,
      _mime_type: extra.mime_type ?? null,
      _size_bytes: extra.size_bytes ?? null,
      _error_code: extra.error_code ?? null,
      _error_message: extra.error_message ?? null,
      _user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
    });
  } catch {
    /* auditoria não pode bloquear a UX */
  }
}

export function useAvatarUpload(opts: {
  userId: string | undefined;
  onUploaded: (path: string) => void;
  refetchProfile: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function upload(file: File | null) {
    if (!file || !opts.userId) return;
    const nameLower = (file.name || "").toLowerCase();
    const extFromName = nameLower.split(".").pop() || "";
    const validExts = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
    const looksImage = file.type.startsWith("image/") || validExts.includes(extFromName);
    if (!looksImage) {
      toast.error("Selecione uma imagem");
      void logAvatarEvent("validation_failed", {
        mime_type: file.type,
        size_bytes: file.size,
        error_code: "invalid_type",
      });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 3MB)");
      void logAvatarEvent("validation_failed", {
        mime_type: file.type,
        size_bytes: file.size,
        error_code: "too_large",
      });
      return;
    }
    setUploading(true);
    const ext = extFromName || "jpg";
    const path = `${opts.userId}/avatar-${Date.now()}.${ext}`;
    const contentType = file.type || `image/${ext === "jpg" ? "jpeg" : ext}`;
    try {
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType });
      if (upErr) throw upErr;
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", opts.userId);
      if (updErr) throw updErr;
      opts.onUploaded(path);
      toast.success("Foto atualizada!");
      void logAvatarEvent("upload_ok", {
        storage_path: path,
        mime_type: contentType,
        size_bytes: file.size,
      });
      opts.refetchProfile();
    } catch (err: any) {
      const status = err?.status ?? err?.statusCode;
      const rawMsg: string = err?.message ?? "";
      const lower = `${err?.error ?? ""} ${rawMsg}`.toLowerCase();
      const isRlsDenied =
        status === 403 || /row-level security|not authorized|forbidden/i.test(lower);
      let friendly = "Não foi possível enviar sua foto. Tente novamente.";
      if (isRlsDenied) friendly = "Sem permissão para enviar essa foto. Faça login novamente.";
      else if (/network|failed to fetch/i.test(lower)) friendly = "Sem conexão. Tente de novo.";
      toast.error(friendly);
      void logAvatarEvent(isRlsDenied ? "rls_denied" : "upload_fail", {
        storage_path: path,
        mime_type: contentType,
        size_bytes: file.size,
        error_code: String(status ?? "unknown"),
        error_message: rawMsg.slice(0, 300),
      });
    } finally {
      setUploading(false);
    }
  }

  return { uploading, upload };
}
