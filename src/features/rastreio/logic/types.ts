import { ChefHat, Package, Truck, CheckCircle2 } from "lucide-react";

/**
 * Etapas do rastreio do cliente — mesmo agrupamento do Kanban da loja
 * (Preparação → Pronto → Coletado → Entregue).
 *
 * `matches` lista os status reais do pedido que pertencem a essa etapa.
 */
export const STATUS_STEPS = [
  {
    key: "preparacao",
    label: "Em preparação",
    icon: ChefHat,
    matches: ["novo", "aceito", "em_preparo"],
  },
  {
    key: "pronto",
    label: "Pronto para coleta",
    icon: Package,
    matches: ["pronto"],
  },
  {
    key: "coletado",
    label: "A caminho",
    icon: Truck,
    matches: ["em_rota", "coletado"],
  },
  {
    key: "entregue",
    label: "Entregue",
    icon: CheckCircle2,
    matches: ["entregue"],
  },
] as const;

export type RastreioData = {
  status: string;
  numero: string | number;
  loja_nome: string;
  cliente_nome: string;
  codigo_entrega: string | null;
  entrega_confirmada_em: string | null;
  endereco_entrega: string;
  complemento: string | null;
};
