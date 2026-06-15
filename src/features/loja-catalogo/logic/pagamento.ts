export type FormaPagamento =
  | "pix"
  | "dinheiro"
  | "cartao_credito"
  | "pix_online"
  | "cartao_online";

export type PagOpt = { v: FormaPagamento; l: string };

export function pagamentoOptions(mpAtivo: boolean): PagOpt[] {
  if (mpAtivo) {
    return [
      { v: "cartao_credito", l: "Cartão na entrega" },
      { v: "pix_online", l: "Pix online" },
      { v: "cartao_online", l: "Cartão online" },
    ];
  }
  return [
    { v: "pix", l: "PIX (manual)" },
    { v: "cartao_credito", l: "Cartão na entrega" },
    { v: "dinheiro", l: "Dinheiro" },
  ];
}
