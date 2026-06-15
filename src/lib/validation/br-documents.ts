import { onlyDigits } from "@/lib/format/document";

/** Validação completa de CPF (dígitos verificadores). */
export function isValidCpf(value: string | null | undefined): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;

  const calcDigit = (slice: string, factorStart: number): number => {
    let sum = 0;
    let factor = factorStart;
    for (const ch of slice) {
      sum += Number(ch) * factor--;
    }
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  const d1 = calcDigit(cpf.slice(0, 9), 10);
  const d2 = calcDigit(cpf.slice(0, 10), 11);
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

/** Validação completa de CNPJ (dígitos verificadores). */
export function isValidCnpj(value: string | null | undefined): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  const calcDigit = (slice: string, weights: number[]): number => {
    const sum = slice
      .split("")
      .reduce((acc, ch, idx) => acc + Number(ch) * weights[idx], 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calcDigit(cnpj.slice(0, 12), w1);
  const d2 = calcDigit(cnpj.slice(0, 13), w2);
  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
}

export function isValidCep(value: string | null | undefined): boolean {
  return onlyDigits(value).length === 8;
}

/** Telefone BR aceita 10 (fixo) ou 11 (móvel) dígitos. */
export function isValidPhoneBr(value: string | null | undefined): boolean {
  const len = onlyDigits(value).length;
  return len === 10 || len === 11;
}
