import { formatCurrency } from "@/lib/format";

export const brl = (n: number | string | null | undefined) => formatCurrency(Number(n ?? 0));
