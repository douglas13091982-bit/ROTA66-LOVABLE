import type { LojaCategoria } from "@/lib/loja-categorias";

export const LOGO_MAX_BYTES = 500_000;

export type ConfigForm = {
  nome: string;
  telefone: string;
  endereco: string;
  bairro: string;
  ativa: boolean;
  catalogo_layout: "cards" | "lista";
  catalogo_status_inicial: "em_preparo" | "pronto";
  categoria: LojaCategoria | "";
  usar_horario_automatico: boolean;
  city_id: string;
};

export const DEFAULT_FORM: ConfigForm = {
  nome: "",
  telefone: "",
  endereco: "",
  bairro: "",
  ativa: true,
  catalogo_layout: "cards",
  catalogo_status_inicial: "em_preparo",
  categoria: "",
  usar_horario_automatico: false,
  city_id: "",
};
