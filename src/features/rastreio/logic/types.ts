import { Package, CheckCircle2, ChefHat, Bike, Truck } from "lucide-react";

export const STATUS_STEPS = [
  { key: "novo", label: "Recebido", icon: Package },
  { key: "aceito", label: "Aceito", icon: CheckCircle2 },
  { key: "em_preparo", label: "Em preparo", icon: ChefHat },
  { key: "pronto", label: "Pronto", icon: Package },
  { key: "em_rota", label: "Saiu para coleta", icon: Bike },
  { key: "coletado", label: "Em rota de entrega", icon: Truck },
  { key: "entregue", label: "Entregue", icon: CheckCircle2 },
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
