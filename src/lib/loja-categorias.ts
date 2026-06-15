export const LOJA_CATEGORIAS = [
  { value: "restaurante", label: "Restaurante" },
  { value: "lanchonete", label: "Lanchonete" },
  { value: "pizzaria", label: "Pizzaria" },
  { value: "sorveteria", label: "Sorveteria" },
  { value: "doceria", label: "Doceria / Confeitaria" },
  { value: "padaria", label: "Padaria" },
  { value: "acougue", label: "Açougue / Carnes" },
  { value: "hortifruti", label: "Hortifrúti / Verduras" },
  { value: "mercado", label: "Mercado" },
  { value: "conveniencia", label: "Loja de conveniência" },
  { value: "bebidas", label: "Bebidas (distribuidora)" },
  { value: "farmacia", label: "Farmácia" },
  { value: "pet_shop", label: "Pet Shop" },
  { value: "auto_pecas", label: "Auto Peças" },
  { value: "moto_pecas", label: "Moto Peças" },
  { value: "roupas", label: "Roupas / Moda" },
  { value: "calcados", label: "Calçados" },
  { value: "material_construcao", label: "Material de construção" },
  { value: "eletronicos", label: "Eletrônicos" },
  { value: "floricultura", label: "Floricultura" },
  { value: "livraria", label: "Livraria / Papelaria" },
  { value: "outros", label: "Outros" },
] as const;

export type LojaCategoria = (typeof LOJA_CATEGORIAS)[number]["value"];

export function labelCategoria(v: string | null | undefined): string {
  if (!v) return "—";
  return LOJA_CATEGORIAS.find((c) => c.value === v)?.label ?? v;
}
