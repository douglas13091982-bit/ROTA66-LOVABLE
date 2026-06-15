export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}

export function formatCnpj(s: string) {
  const d = onlyDigits(s).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function isValidCnpj(raw: string): boolean {
  const s = onlyDigits(raw);
  if (s.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(s)) return false;
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(s[i], 10) * w1[i];
  let d1 = sum % 11;
  d1 = d1 < 2 ? 0 : 11 - d1;
  if (d1 !== parseInt(s[12], 10)) return false;
  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(s[i], 10) * w2[i];
  let d2 = sum % 11;
  d2 = d2 < 2 ? 0 : 11 - d2;
  return d2 === parseInt(s[13], 10);
}

export function makeSuffix() {
  return (
    globalThis.crypto?.randomUUID?.().replace(/-/g, "").slice(0, 8) ??
    Math.random().toString(36).slice(2, 10).padEnd(8, "0")
  );
}
