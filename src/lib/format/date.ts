import { i18nConfig } from "../i18n-config";

const DATE_TIME = new Intl.DateTimeFormat(i18nConfig.locale, {
  dateStyle: "short",
  timeStyle: "short",
});

const DATE_ONLY = new Intl.DateTimeFormat(i18nConfig.locale, { dateStyle: "short" });
const TIME_ONLY = new Intl.DateTimeFormat(i18nConfig.locale, { timeStyle: "short" });

type DateInput = Date | string | number | null | undefined;

function toDate(input: DateInput): Date | null {
  if (input == null) return null;
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateTime(input: DateInput): string {
  const d = toDate(input);
  return d ? DATE_TIME.format(d) : "";
}

export function formatDate(input: DateInput): string {
  const d = toDate(input);
  return d ? DATE_ONLY.format(d) : "";
}

export function formatTime(input: DateInput): string {
  const d = toDate(input);
  return d ? TIME_ONLY.format(d) : "";
}

/** "há 5 min", "há 2 h", "há 3 d". Para valores futuros, retorna "agora". */
export function formatRelative(input: DateInput, now: Date = new Date()): string {
  const d = toDate(input);
  if (!d) return "";
  const diffMs = now.getTime() - d.getTime();
  
  const isPt = i18nConfig.locale === "pt-BR";
  const nowStr = isPt ? "agora" : "ahora";
  const agoStr = isPt ? "há" : "hace";
  
  if (diffMs < 60_000) return nowStr;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${agoStr} ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${agoStr} ${hours} h`;
  const days = Math.floor(hours / 24);
  return `${agoStr} ${days} d`;
}
