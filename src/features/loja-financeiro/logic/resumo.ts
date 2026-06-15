import type { Cobranca, Mensalidade } from "./types";

export function calcularResumo(cobrancas: Cobranca[], mensalidades: Mensalidade[]) {
  const cobAbertas = cobrancas.filter((c) => !c.pago);
  const mensAbertas = mensalidades.filter((m) => !m.pago);
  const cobAberto = cobAbertas.reduce((s, c) => s + Number(c.valor), 0);
  const mensAberto = mensAbertas.reduce((s, m) => s + Number(m.valor), 0);
  const totalAberto = cobAberto + mensAberto;
  const totalPago =
    cobrancas.filter((c) => c.pago).reduce((s, c) => s + Number(c.valor), 0) +
    mensalidades.filter((m) => m.pago).reduce((s, m) => s + Number(m.valor), 0);
  const prox = [
    ...cobAbertas.map((c) => c.vencimento),
    ...mensAbertas.map((m) => m.vencimento),
  ].sort()[0];
  return { cobAbertas, mensAbertas, cobAberto, mensAberto, totalAberto, totalPago, prox };
}
