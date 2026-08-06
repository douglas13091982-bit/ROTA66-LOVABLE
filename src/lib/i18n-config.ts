/**
 * Centraliza a configuração de localização do sistema.
 * Atualmente suporta BRL (Brasil) e MXN (México).
 */

export type AppLocale = "pt-BR" | "es-MX";
export type AppCurrency = "BRL" | "MXN";

interface Config {
  locale: AppLocale;
  currency: AppCurrency;
  currencySymbol: string;
}

const CONFIGS: Record<AppLocale, Config> = {
  "pt-BR": {
    locale: "pt-BR",
    currency: "BRL",
    currencySymbol: "R$",
  },
  "es-MX": {
    locale: "es-MX",
    currency: "MXN",
    currencySymbol: "$",
  },
};

// Por padrão, usa pt-BR. Futuramente pode vir de uma variável de ambiente ou preferência do usuário/loja.
const currentLocale: AppLocale = (import.meta.env.VITE_APP_LOCALE as AppLocale) || "pt-BR";

export const i18nConfig = CONFIGS[currentLocale];
