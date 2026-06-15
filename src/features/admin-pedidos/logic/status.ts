export const STATUS_COLOR: Record<string, string> = {
  novo: "bg-primary text-primary-foreground",
  aceito: "bg-blue-600 text-white",
  em_preparo: "bg-amber-600 text-white",
  pronto: "bg-purple-600 text-white",
  em_rota: "bg-indigo-600 text-white",
  entregue: "bg-green-600 text-white",
  cancelado: "bg-zinc-600 text-white",
};

export function statusClass(status: string): string {
  return STATUS_COLOR[status] ?? "bg-zinc-600 text-white";
}
