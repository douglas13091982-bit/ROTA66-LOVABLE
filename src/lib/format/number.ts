import { i18nConfig } from "../i18n-config";

const NUMBER = new Intl.NumberFormat(i18nConfig.locale);

/** Formata um número inteiro/decimal no locale local (ex.: 1.234). */
export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "0";
  return NUMBER.format(value);
}
