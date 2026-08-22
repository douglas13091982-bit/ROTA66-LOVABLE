import { ChefHat, Package, Truck, MapPin, CheckCircle2 } from "lucide-react";

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
    key: "a_caminho_coleta",
    label: "A caminho da Coleta",
    icon: Truck,
    matches: ["em_rota"],
  },
  {
    key: "coletado",
    label: "Coletado",
    icon: Truck,
    matches: [] as string[],
  },
  {
    key: "a_caminho",
    label: "A caminho",
    icon: Truck,
    matches: ["coletado"],
  },
  {
    key: "chegou",
    label: "Entregador chegou no local",
    icon: MapPin,
    matches: [] as string[],
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
  chegou_entrega_at: string | null;
  endereco_entrega: string;
  complemento: string | null;
  entregador_id?: string | null;
  entregador_nome?: string | null;
  entregador_foto?: string | null;
  loja_lat?: number | null;
  loja_lng?: number | null;
  entrega_lat?: number | null;
  entrega_lng?: number | null;
};
