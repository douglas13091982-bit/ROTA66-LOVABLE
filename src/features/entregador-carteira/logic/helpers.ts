import { formatCurrency } from "@/lib/format";

export const brl = (n: number | string | null | undefined) =>
  formatCurrency(Number(n ?? 0));

export const tipoCls: Record<string, string> = {
  recarga: "text-green-400",
  mensalidade: "text-amber-400",
  ajuste_manual: "text-blue-400",
  estorno: "text-purple-400",
};
