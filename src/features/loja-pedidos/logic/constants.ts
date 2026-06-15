/**
 * Constantes do domínio de pedidos da loja.
 * Pure data — sem dependências de React/Supabase.
 */

export const STATUS_LABEL: Record<string, string> = {
  novo: "Novo",
  aceito: "Aceito",
  em_preparo: "Em preparo",
  pronto: "Pronto",
  em_rota: "Coletando",
  coletado: "Coletado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export const STATUS_COLOR: Record<string, string> = {
  novo: "bg-[oklch(0.55_0.26_25)] text-white",
  aceito: "bg-[oklch(0.35_0.06_265)] text-white",
  em_preparo: "bg-[oklch(0.55_0.16_75)] text-[#0e0f12]",
  pronto: "bg-[oklch(0.50_0.24_25)] text-white",
  em_rota: "bg-[oklch(0.40_0.06_265)] text-white",
  coletado: "bg-[oklch(0.45_0.06_265)] text-white",
  entregue: "bg-[oklch(0.38_0.06_165)] text-white",
  cancelado: "bg-zinc-600 text-white",
};

/**
 * Próximo status no fluxo controlado pela loja.
 * Após "pronto", o entregador assume e a loja não avança mais.
 */
export const NEXT: Record<string, string | null> = {
  novo: "pronto",
  aceito: "pronto",
  em_preparo: "pronto",
  pronto: null,
  em_rota: null,
  coletado: null,
  entregue: null,
  cancelado: null,
};

export type ColumnDef = {
  key: string;
  title: string;
  statuses: string[];
  accent: string;
};

export const COLUMNS: ColumnDef[] = [
  { key: "preparacao", title: "Preparação", statuses: ["novo", "aceito", "em_preparo"], accent: "border-t-[oklch(0.55_0.16_75)]" },
  { key: "pronto", title: "Pronto", statuses: ["pronto"], accent: "border-t-[oklch(0.55_0.26_25)]" },
  { key: "coletado", title: "Coletado", statuses: ["em_rota", "coletado"], accent: "border-t-[oklch(0.35_0.06_265)]" },
  { key: "entregue", title: "Entregue", statuses: ["entregue"], accent: "border-t-[oklch(0.38_0.06_165)]" },
];

export const LOJA_CONTROLA_STATUSES = new Set(["novo", "aceito", "em_preparo"]);

export const lojaControlaStatus = (status: string): boolean =>
  LOJA_CONTROLA_STATUSES.has(status);
