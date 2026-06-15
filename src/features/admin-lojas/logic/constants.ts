export type StatusFilter = "todas" | "pendente" | "aprovado" | "bloqueado";

export const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pendente: { label: "Pendente", cls: "bg-amber-600/20 text-amber-400" },
  aprovado: { label: "Aprovada", cls: "bg-green-600/20 text-green-500" },
  bloqueado: { label: "Bloqueada", cls: "bg-red-600/20 text-red-400" },
};

export const FILTER_OPTIONS: StatusFilter[] = [
  "todas",
  "pendente",
  "aprovado",
  "bloqueado",
];

export function statusOf(status: string | null | undefined) {
  return STATUS_LABEL[status ?? "pendente"] ?? STATUS_LABEL.pendente;
}
