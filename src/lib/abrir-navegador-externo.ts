/**
 * Abre uma URL FORA do WebView do app (Kodular / TWA / Capacitor).
 *
 * Por que existe: o WebView do Android bloqueia `<input type="file">` e
 * `getUserMedia` por padrão. Quando o entregador precisa enviar CNH/foto
 * do veículo dentro do APK, o botão de upload não abre nada. Redirecionar
 * pro Chrome nativo resolve — lá o upload funciona 100%.
 *
 * Estratégia:
 * 1. Tenta abrir via Android Intent URL forçando o Chrome (fallback: navegador padrão).
 * 2. Se não for Android ou o intent falhar, faz window.open normal em nova aba.
 */
export function abrirNoNavegadorExterno(url: string) {
  const absolute = url.startsWith("http")
    ? url
    : `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;

  const ua = navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);

  if (isAndroid) {
    // Remove esquema pra montar o intent URL corretamente
    const semEsquema = absolute.replace(/^https?:\/\//, "");
    // browser_fallback_url garante abertura mesmo sem Chrome instalado
    const fallback = encodeURIComponent(absolute);
    const intentUrl =
      `intent://${semEsquema}#Intent;scheme=https;` +
      `package=com.android.chrome;` +
      `S.browser_fallback_url=${fallback};end`;

    try {
      window.location.href = intentUrl;
      return;
    } catch {
      // cai no window.open abaixo
    }
  }

  // iOS / desktop / fallback
  const win = window.open(absolute, "_blank", "noopener,noreferrer");
  if (!win) {
    // Popup bloqueado — força navegação
    window.location.href = absolute;
  }
}
