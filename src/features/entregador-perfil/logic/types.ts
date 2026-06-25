export type SectionKey = "info" | "pagamentos" | "indicacao" | "seguranca" | "ajuda" | "config" | null;
export type MenuKey = Exclude<SectionKey, null> | "carteira" | "mensalidade";
export type TipoVeiculo = "moto" | "carro";

export type PerfilForm = {
  fullName: string;
  phone: string;
  pixChave: string;
  aceitaExternos: boolean;
  tipoVeiculo: TipoVeiculo;
  avatarUrl: string | null;
};
