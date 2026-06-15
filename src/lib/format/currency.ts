const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const BRL_NO_SYMBOL = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formata um número como moeda brasileira: 1234.5 -> "R$ 1.234,50". */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "R$ 0,00";
  return BRL.format(value);
}

/** Como `formatCurrency`, sem o símbolo "R$". */
export function formatCurrencyValue(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "0,00";
  return BRL_NO_SYMBOL.format(value);
}

/** Converte string "1.234,56" / "1234,56" / "1234.56" em number. Retorna null se inválido. */
export function parseCurrency(input: string | null | undefined): number | null {
  if (!input) return null;
  const cleaned = input
    .replace(/\s|R\$/gi, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
