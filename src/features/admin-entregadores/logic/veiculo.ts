import { Bike, Car, Truck, Zap, type LucideIcon } from "lucide-react";

export type VeiculoInfo = { label: string; Icon: LucideIcon; cls: string };

const MAP: Record<string, VeiculoInfo> = {
  moto: { label: "Moto", Icon: Bike, cls: "bg-muted text-muted-foreground" },
  carro: { label: "Carro", Icon: Car, cls: "bg-blue-600/20 text-blue-400" },
  caminhonete: { label: "Caminhonete", Icon: Truck, cls: "bg-purple-600/20 text-purple-400" },
  bike_eletrica: { label: "Bike elétrica", Icon: Zap, cls: "bg-emerald-600/20 text-emerald-400" },
};

export function veiculoInfo(tipo?: string | null): VeiculoInfo {
  return MAP[tipo ?? ""] ?? MAP.moto;
}
