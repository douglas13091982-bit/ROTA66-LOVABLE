import type { TurnoRow } from "./types";

export const STATUS_LABEL: Record<TurnoRow["status"], { label: string; color: string }> = {
  rascunho: { label: "Rascunho", color: "bg-zinc-700 text-zinc-100" },
  publicado: { label: "Aguardando entregador", color: "bg-amber-500/20 text-amber-300" },
  aceito: { label: "Aceito", color: "bg-emerald-500/20 text-emerald-300" },
  concluido: { label: "Concluído", color: "bg-blue-500/20 text-blue-300" },
  cancelado: { label: "Cancelado", color: "bg-red-500/20 text-red-300" },
};

export const INPUT_CLS =
  "w-full px-3 py-2.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary";
export const LABEL_CLS =
  "block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5";
