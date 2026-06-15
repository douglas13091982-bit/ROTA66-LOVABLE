import type { LojaCategoria } from "@/lib/loja-categorias";

export const LOGO_MAX_BYTES = 500_000;

export type ConfigForm = {
  nome: string;
  telefone: string;
  endereco: string;
  bairro: string;
  ativa: boolean;
  catalogo_layout: "cards" | "lista";
  categoria: LojaCategoria | "";
  usar_horario_automatico: boolean;
};

export const DEFAULT_FORM: ConfigForm = {
  nome: "",
  telefone: "",
  endereco: "",
  bairro: "",
  ativa: true,
  catalogo_layout: "cards",
  categoria: "",
  usar_horario_automatico: false,
};
