/** Mantém apenas dígitos. */
export const onlyDigits = (s: string | null | undefined): string =>
  (s ?? "").replace(/\D+/g, "");

/** Formata CPF: "12345678901" -> "123.456.789-01". */
export function formatCpf(input: string | null | undefined): string {
  const d = onlyDigits(input).slice(0, 11);
  if (d.length !== 11) return d;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Formata CNPJ: "12345678000199" -> "12.345.678/0001-99". */
export function formatCnpj(input: string | null | undefined): string {
  const d = onlyDigits(input).slice(0, 14);
  if (d.length !== 14) return d;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/**
 * Remove o código de país 55 do início do telefone brasileiro.
 * Ex.: "5547999999999" -> "47999999999"; "+55 47 99999-9999" -> "47999999999".
 * Mantém como está se não começar com 55 ou se o tamanho final ficaria inválido.
 */
export function normalizeBrPhone(input: string | null | undefined): string {
  const d = onlyDigits(input);
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) {
    return d.slice(2);
  }
  return d;
}

/** Formata CEP: "01001000" -> "01001-000". */
export function formatCep(input: string | null | undefined): string {
  const d = onlyDigits(input).slice(0, 8);
  if (d.length !== 8) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** Formata telefone BR (10 ou 11 dígitos). */
export function formatPhone(input: string | null | undefined): string {
  const d = onlyDigits(input).slice(0, 11);
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return d;
}
