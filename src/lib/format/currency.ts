import { i18nConfig } from "../i18n-config";

const CURRENCY_FORMATTER = new Intl.NumberFormat(i18nConfig.locale, {
  style: "currency",
  currency: i18nConfig.currency,
});

const NO_SYMBOL_FORMATTER = new Intl.NumberFormat(i18nConfig.locale, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formata um número como moeda local. */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return CURRENCY_FORMATTER.format(0);
  }
  return CURRENCY_FORMATTER.format(value);
}

/** Como `formatCurrency`, sem o símbolo da moeda. */
export function formatCurrencyValue(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "0,00";
  return NO_SYMBOL_FORMATTER.format(value);
}


/** Converte string formatada em number. Retorna null se inválido. */
export function parseCurrency(input: string | null | undefined): number | null {
  if (!input) return null;
  
  // Limpa o símbolo da moeda e espaços
  const symbol = i18nConfig.currencySymbol;
  // Escapa o símbolo $ para regex
  const escapedSymbol = symbol.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const cleaned = input
    .replace(new RegExp(`\\s|${escapedSymbol}`, "gi"), "")
    .replace(i18nConfig.locale === "pt-BR" ? /\./g : /,/g, "")
    .replace(i18nConfig.locale === "pt-BR" ? "," : ".", ".");
    
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}


