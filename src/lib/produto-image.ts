import { supabase } from "@/integrations/supabase/client";

const SIGN_EXPIRES = 60 * 60 * 24 * 7; // 7 days

/** Extracts the storage path from either a full Supabase URL or a raw path. Returns null when empty. */
export function extractProdutoPath(imagem_url: string | null | undefined): string | null {
  if (!imagem_url) return null;
  const s = imagem_url.trim();
  if (!s) return null;
  // Match `/object/(public|sign)/produtos/<path>` from any Supabase URL form.
  const m = s.match(/\/object\/(?:public|sign)\/produtos\/([^?]+)/);
  if (m) return decodeURIComponent(m[1]);
  // Already a raw path
  if (!/^https?:\/\//i.test(s)) return s.replace(/^\/+/, "");
  return null;
}

/** Returns a map { path -> signedUrl } for the given paths. */
export async function signProdutoPaths(paths: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) return {};
  const { data, error } = await supabase.storage
    .from("produtos")
    .createSignedUrls(unique, SIGN_EXPIRES);
  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  }
  return out;
}

/** Receives an array with `imagem_url` and returns a copy where `imagem_url` is a signed URL (or null). External http(s) URLs are kept as-is. */
export async function withSignedProdutoImages<T extends { imagem_url: string | null }>(items: T[]): Promise<T[]> {
  const pathByIndex = items.map((p) => extractProdutoPath(p.imagem_url));
  const map = await signProdutoPaths(pathByIndex.filter((p): p is string => !!p));
  return items.map((p, i) => {
    const path = pathByIndex[i];
    if (path) return { ...p, imagem_url: map[path] ?? null };
    // Keep external URLs untouched (e.g. https://images.unsplash.com/...)
    if (p.imagem_url && /^https?:\/\//i.test(p.imagem_url)) return p;
    return { ...p, imagem_url: null };
  });
}

/** Like `withSignedProdutoImages` but keeps the raw `imagem_url` and adds `imagem_signed_url`. External http(s) URLs flow through. */
export async function withProdutoSignedSidecar<T extends { imagem_url: string | null }>(
  items: T[]
): Promise<(T & { imagem_signed_url: string | null })[]> {
  const pathByIndex = items.map((p) => extractProdutoPath(p.imagem_url));
  const map = await signProdutoPaths(pathByIndex.filter((p): p is string => !!p));
  return items.map((p, i) => {
    const path = pathByIndex[i];
    if (path) return { ...p, imagem_signed_url: map[path] ?? null };
    if (p.imagem_url && /^https?:\/\//i.test(p.imagem_url)) return { ...p, imagem_signed_url: p.imagem_url };
    return { ...p, imagem_signed_url: null };
  });
}

