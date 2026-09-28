import { Bike } from "lucide-react";

export type Role = "entregador";

export const ROLE_OPTIONS = [
  { value: "entregador" as const, label: "Entregador", Icon: Bike, desc: "Moto, carro ou bicicleta elétrica" },
];
