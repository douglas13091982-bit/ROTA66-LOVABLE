import type { Despesa } from "./types";

export type TotaisDespesas = {
  despesa: number;
  investimento: number;
  total: number;
  pago: number;
  aberto: number;
};

export function calcTotais(lista: Despesa[] | undefined): TotaisDespesas {
  const itens = lista ?? [];
  const despesa = itens.filter((d) => d.tipo === "despesa").reduce((s, d) => s + Number(d.valor), 0);
  const investimento = itens.filter((d) => d.tipo === "investimento").reduce((s, d) => s + Number(d.valor), 0);
  const total = despesa + investimento;
  const pago = itens.filter((d) => d.pago).reduce((s, d) => s + Number(d.valor), 0);
  return { despesa, investimento, total, pago, aberto: total - pago };
}
