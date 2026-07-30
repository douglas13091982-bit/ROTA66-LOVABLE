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
  novo: "bg-[oklch(0.55_0.26_25)] !text-white",
  aceito: "bg-[oklch(0.35_0.06_265)] !text-white",
  em_preparo: "bg-[oklch(0.55_0.16_75)] !text-white",
  pronto: "bg-[oklch(0.50_0.24_25)] !text-white",
  em_rota: "bg-[oklch(0.40_0.06_265)] !text-white",
  coletado: "bg-[oklch(0.45_0.06_265)] !text-white",
  entregue: "bg-[oklch(0.38_0.06_165)] !text-white",
  cancelado: "bg-zinc-600 !text-white",
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
  subtitle: string;
  emptyText: string;
  statuses: string[];
  accent: string;
  /** Cor sólida do topo/ícone (usada no layout mobile). */
  tone: string;
  iconBg: string;
  badge: string;
};

export const COLUMNS: ColumnDef[] = [
  {
    key: "preparacao",
    title: "Preparação",
    subtitle: "Aguardando preparo",
    emptyText: "Os pedidos aparecerão aqui quando houver itens aguardando preparo.",
    statuses: ["novo", "aceito", "em_preparo"],
    accent: "border-t-[oklch(0.55_0.16_75)]",
    tone: "bg-[oklch(0.62_0.16_75)]",
    iconBg: "bg-[oklch(0.62_0.16_75)] !text-white",
    badge: "bg-[oklch(0.62_0.16_75)]/25 text-[oklch(0.80_0.14_75)]",
  },
  {
    key: "pronto",
    title: "Pronto",
    subtitle: "Aguardando retirada",
    emptyText: "Os pedidos prontos para retirada aparecerão aqui.",
    statuses: ["pronto"],
    accent: "border-t-[oklch(0.55_0.26_25)]",
    tone: "bg-[oklch(0.55_0.26_25)]",
    iconBg: "bg-[oklch(0.55_0.26_25)] !text-white",
    badge: "bg-[oklch(0.55_0.26_25)]/25 text-[oklch(0.78_0.16_25)]",
  },
  {
    key: "coletado",
    title: "Coletado",
    subtitle: "Saiu para entrega",
    emptyText: "Pedidos que já foram coletados aparecerão aqui.",
    statuses: ["em_rota", "coletado"],
    accent: "border-t-[oklch(0.55_0.16_150)]",
    tone: "bg-[oklch(0.60_0.16_150)]",
    iconBg: "bg-[oklch(0.60_0.16_150)] !text-white",
    badge: "bg-[oklch(0.60_0.16_150)]/25 text-[oklch(0.80_0.14_150)]",
  },
  // Cancelados ficam junto com "Entregue" (arquivados) — o badge de status "Cancelado" diferencia visualmente.
  {
    key: "entregue",
    title: "Entregue",
    subtitle: "Finalizados",
    emptyText: "Os pedidos finalizados aparecerão aqui.",
    statuses: ["entregue", "cancelado"],
    accent: "border-t-[oklch(0.38_0.06_165)]",
    tone: "bg-[oklch(0.50_0.08_200)]",
    iconBg: "bg-[oklch(0.50_0.08_200)] !text-white",
    badge: "bg-[oklch(0.50_0.08_200)]/25 text-[oklch(0.80_0.05_200)]",
  },
];


export const LOJA_CONTROLA_STATUSES = new Set(["novo", "aceito", "em_preparo"]);

export const lojaControlaStatus = (status: string): boolean =>
  LOJA_CONTROLA_STATUSES.has(status);
