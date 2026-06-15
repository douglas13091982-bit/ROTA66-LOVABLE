import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Cache em memória para evitar gerar signed URL toda hora.
// Valor é { url, expiresAt } — re-emite antes de expirar.
const cache = new Map<string, { url: string; expiresAt: number }>();
const TTL_SECONDS = 60 * 60; // 1h

/**
 * Converte um valor armazenado em profiles.avatar_url para uma URL utilizável.
 * Aceita:
 *  - storage path puro (ex: "<uid>/avatar-123.jpg")
 *  - signed URL legada (.../object/sign/avatars/<path>?token=...)
 *  - public URL (.../object/public/avatars/<path>)
 *  - data: / blob: / http(s) externos — devolve como veio
 */
function extractPath(stored: string): string | null {
  if (!stored) return null;
  if (stored.startsWith("data:") || stored.startsWith("blob:")) return null;
  const m = stored.match(/\/storage\/v1\/object\/(?:sign|public)\/avatars\/([^?]+)/);
  if (m) return decodeURIComponent(m[1]);
  // Se for http(s) externo (não Supabase Storage de avatars), não tenta assinar.
  if (/^https?:\/\//.test(stored)) return null;
  return stored.replace(/^\/+/, "");
}

export async function resolveAvatarUrl(stored: string | null | undefined): Promise<string | null> {
  if (!stored) return null;
  if (stored.startsWith("data:") || stored.startsWith("blob:")) return stored;
  const path = extractPath(stored);
  if (!path) return stored; // URL externa qualquer
  const now = Date.now();
  const hit = cache.get(path);
  if (hit && hit.expiresAt > now + 60_000) return hit.url;
  const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  cache.set(path, { url: data.signedUrl, expiresAt: now + TTL_SECONDS * 1000 });
  return data.signedUrl;
}

type Props = {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  fallback?: React.ReactNode;
};

export function AvatarImg({ src, alt = "Avatar", className, fallback = null }: Props) {
  const [resolved, setResolved] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setResolved(null);
    resolveAvatarUrl(src).then((u) => {
      if (active) setResolved(u);
    });
    return () => {
      active = false;
    };
  }, [src]);

  if (!resolved) return <>{fallback}</>;
  return <img src={resolved} alt={alt} className={className} />;
}
