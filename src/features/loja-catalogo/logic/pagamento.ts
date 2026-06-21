export type FormaPagamento =
  | "pix"
  | "dinheiro"
  | "cartao"
  | "pix_online"
  | "cartao_online";

export type PagOpt = { v: FormaPagamento; l: string };

export function pagamentoOptions(_mpAtivo: boolean): PagOpt[] {
  return [
    { v: "cartao", l: "Cartão" },
    { v: "pix", l: "PIX" },
  ];
}
