export type FormaPagamento =
  | "pix"
  | "dinheiro"
  | "cartao"
  | "pix_online"
  | "cartao_online";

export type PagOpt = { v: FormaPagamento; l: string };

export function pagamentoOptions(_mpAtivo: boolean): PagOpt[] {
  return [
    { v: "cartao_online", l: "Cartão" },
    { v: "pix_online", l: "PIX" },
  ];
}
