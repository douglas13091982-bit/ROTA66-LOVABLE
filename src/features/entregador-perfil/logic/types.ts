export type SectionKey = "info" | "pagamentos" | "indicacao" | "seguranca" | "ajuda" | "config" | null;
export type MenuKey = Exclude<SectionKey, null> | "carteira" | "mensalidade" | "documentos";
export type TipoVeiculo = "moto" | "carro" | "bike_eletrica";

export type PerfilForm = {
  fullName: string;
  phone: string;
  pixChave: string;
  aceitaExternos: boolean;
  tipoVeiculo: TipoVeiculo;
  avatarUrl: string | null;
};
