import { Bike, Store, User } from "lucide-react";

export type Role = "loja_admin" | "entregador" | "cliente";

export const ROLE_OPTIONS: { value: Role; label: string; Icon: typeof Store; desc: string }[] = [
  { value: "loja_admin", label: "Loja", Icon: Store, desc: "Restaurante, mercado ou loja" },
  { value: "entregador", label: "Entregador", Icon: Bike, desc: "Moto, carro ou caminhonete" },
  { value: "cliente", label: "Cliente", Icon: User, desc: "Comprar em lojas e restaurantes" },
];
