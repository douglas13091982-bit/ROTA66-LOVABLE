/**
 * Sanitização de inputs do usuário.
 * Funções puras, sem dependência de React. Aplicar SEMPRE no onChange
 * (defesa contra XSS, controle de caracteres invisíveis e limite de tamanho).
 *
 * Observação: além desta sanitização no client, sempre valide no servidor
 * (RLS + validators) — client-side é defesa em profundidade, não única.
 */

// Regex de tags HTML, handlers inline (on*=) e protocolos perigosos.
const RE_TAG = /<\/?[a-zA-Z][^>]*>/g;
const RE_INLINE_HANDLER = /\bon[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const RE_DANGEROUS_PROTOCOL = /\b(javascript|vbscript|data)\s*:/gi;
// Caracteres de controle (exceto \t \n \r) + zero-width.
const RE_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200D\uFEFF]/g;

/**
 * Limpa texto livre: remove tags, handlers inline, protocolos perigosos
 * e caracteres de controle. Aplica limite de caracteres.
 */
export function sanitizeText(value: string, maxLength = 1000): string {
  if (!value) return "";
  return value
    .replace(RE_TAG, "")
    .replace(RE_INLINE_HANDLER, "")
    .replace(RE_DANGEROUS_PROTOCOL, "")
    .replace(RE_CONTROL, "")
    .slice(0, maxLength);
}

/**
 * Aceita apenas letras (com acentos), espaços, apóstrofo e hífen.
 * Para campos de nome de pessoa, cidade, bairro, etc.
 */
export function sanitizeName(value: string, maxLength = 100): string {
  if (!value) return "";
  return value
    .replace(/[^\p{L}\s'\-]/gu, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, maxLength);
}

/** Aceita apenas dígitos. Útil para CEP, código, OTP, quantidade. */
export function sanitizeDigits(value: string, maxLength = 20): string {
  if (!value) return "";
  return value.replace(/\D/g, "").slice(0, maxLength);
}

/** Telefone: dígitos e opcional + no início. */
export function sanitizePhone(value: string, maxLength = 16): string {
  if (!value) return "";
  const plus = value.trim().startsWith("+") ? "+" : "";
  return (plus + value.replace(/\D/g, "")).slice(0, maxLength);
}

/**
 * Número decimal (string). Permite dígitos, um separador e sinal opcional.
 * Aceita vírgula ou ponto e devolve sempre com ponto.
 */
export function sanitizeDecimal(value: string, maxIntDigits = 12, maxDecimals = 2): string {
  if (!value) return "";
  let v = value.replace(",", ".").replace(/[^\d.\-]/g, "");
  // Apenas um '-' no começo
  v = (v.startsWith("-") ? "-" : "") + v.replace(/-/g, "");
  // Apenas um '.'
  const i = v.indexOf(".");
  if (i !== -1) {
    v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, "");
  }
  const [intPart, decPart] = v.split(".");
  const intClean = intPart.replace(/^(-?)0+(\d)/, "$1$2").slice(0, maxIntDigits + (intPart.startsWith("-") ? 1 : 0));
  if (decPart === undefined) return intClean;
  return `${intClean}.${decPart.slice(0, maxDecimals)}`;
}

/** Email: lower, sem espaços, sem controles, limite 254 (RFC 5321). */
export function sanitizeEmail(value: string): string {
  if (!value) return "";
  return value.replace(RE_CONTROL, "").replace(/\s+/g, "").toLowerCase().slice(0, 254);
}
