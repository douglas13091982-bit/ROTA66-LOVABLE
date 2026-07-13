// Utility: converte qualquer imagem enviada pelo usuário em WebP no cliente,
// reduzindo drasticamente o peso antes de subir para storage / salvar em base64.
//
// - Mantém SVG (vetorial) e GIF (pode ser animado) intactos.
// - Redimensiona para no máximo MAX_DIMENSION px no maior lado (preservando proporção).
// - Se o WebP resultante ficar maior que o original (raro), devolve o original.

const MAX_DIMENSION = 1600;
const DEFAULT_QUALITY = 0.82;

function shouldSkip(file: File): boolean {
  const t = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  if (t === "image/svg+xml" || name.endsWith(".svg")) return true;
  if (t === "image/gif" || name.endsWith(".gif")) return true;
  if (t === "image/webp") return true; // já é webp
  if (!t.startsWith("image/")) return true; // não-imagem passa direto
  return false;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = url;
  });
}

/**
 * Converte um File de imagem para WebP.
 * Se a conversão não fizer sentido (SVG/GIF/WebP/erro), devolve o arquivo original.
 */
export async function convertImageToWebp(
  file: File,
  opts: { quality?: number; maxDimension?: number } = {},
): Promise<File> {
  try {
    if (typeof window === "undefined" || shouldSkip(file)) return file;

    const quality = opts.quality ?? DEFAULT_QUALITY;
    const maxDim = opts.maxDimension ?? MAX_DIMENSION;

    const objectUrl = URL.createObjectURL(file);
    let img: HTMLImageElement;
    try {
      img = await loadImage(objectUrl);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }

    let { width, height } = img;
    if (!width || !height) return file;

    const scale = Math.min(1, maxDim / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/webp", quality),
    );
    if (!blob) return file;
    // Se a "conversão" não reduziu tamanho, mantém original.
    if (blob.size >= file.size && file.type.startsWith("image/")) return file;

    const baseName = (file.name || "imagem").replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

/** Converte para WebP e devolve como data URL (base64) — útil para colunas *_data_url. */
export async function convertImageToWebpDataUrl(
  file: File,
  opts?: { quality?: number; maxDimension?: number },
): Promise<string> {
  const webp = await convertImageToWebp(file, opts);
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error("Falha ao ler arquivo"));
    r.readAsDataURL(webp);
  });
}
