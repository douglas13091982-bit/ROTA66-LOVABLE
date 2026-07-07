import { getRequestHost } from "@tanstack/react-start/server";

/**
 * Normaliza o host para uso em URLs públicas (webhook / back_urls do Mercado Pago).
 *
 * O Mercado Pago valida o formato do `notification_url` e rejeita algumas variações
 * de subdomínio dinâmico do preview do Lovable (ex.: `<uuid>.lovableproject.com`),
 * retornando "notification_url attribute must be url valid". Para contornar,
 * mapeamos hosts de preview para o domínio estável `project--<uuid>-dev.lovable.app`,
 * que é público e reconhecido pelo MP.
 */
export function resolvePublicHost(): string {
  const envHost = process.env.PUBLIC_HOST?.trim();
  let host = envHost && envHost.length > 0 ? envHost : "";
  if (!host) {
    try {
      host = getRequestHost();
    } catch {
      host = "";
    }
  }
  if (!host) throw new Error("Host público não configurado");
  return normalizePublicHost(host);
}

export function normalizePublicHost(host: string): string {
  const h = host.trim().toLowerCase();
  // Preview dinâmico: <uuid>.lovableproject.com  →  project--<uuid>-dev.lovable.app
  const previewMatch = h.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.lovableproject\.com$/,
  );
  if (previewMatch) return `project--${previewMatch[1]}-dev.lovable.app`;
  // Preview alternativo id-preview--<uuid>.lovable.app → mesmo destino estável
  const idPreviewMatch = h.match(
    /^id-preview--([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.lovable\.app$/,
  );
  if (idPreviewMatch) return `project--${idPreviewMatch[1]}-dev.lovable.app`;
  return h;
}

export function buildPublicUrl(pathname: string): string {
  const host = resolvePublicHost();
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `https://${host}${path}`;
}
