export type FormaPagamento =
  | "pix"
  | "dinheiro"
  | "cartao"
  | "pix_online"
  | "cartao_online";

export type PagOpt = { v: FormaPagamento; l: string };

export function pagamentoOptions(mpAtivo: boolean): PagOpt[] {
  if (mpAtivo) {
    return [
      { v: "cartao", l: "Cartão" },
      { v: "pix", l: "PIX" },
      { v: "dinheiro", l: "Dinheiro" },
      { v: "pix_online", l: "Pix online" },
      { v: "cartao_online", l: "Cartão online" },
    ];
  }
  return [
    { v: "pix", l: "PIX" },
    { v: "cartao", l: "Cartão" },
    { v: "dinheiro", l: "Dinheiro" },
  ];
}
