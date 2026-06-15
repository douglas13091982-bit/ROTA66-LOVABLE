export const VEICULOS = ["moto", "carro", "caminhonete"] as const;
export type TipoVeiculo = (typeof VEICULOS)[number];

export type TarifaRow = {
  id: string;
  tipo_veiculo: TipoVeiculo;
  faixa_km_min: number;
  faixa_km_max: number;
  valor: number;
  valor_minimo: number | null;
  valor_por_km: number | null;
  ativa: boolean;
};

export type TarifaFormState = {
  tipo_veiculo: TipoVeiculo;
  faixa_km_min: string;
  faixa_km_max: string;
  valor: string;
  valor_minimo: string;
  valor_por_km: string;
};

export const INITIAL_FORM: TarifaFormState = {
  tipo_veiculo: "moto",
  faixa_km_min: "0",
  faixa_km_max: "5",
  valor: "8.00",
  valor_minimo: "8.00",
  valor_por_km: "0",
};
