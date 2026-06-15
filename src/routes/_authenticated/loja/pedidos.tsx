import { createFileRoute } from "@tanstack/react-router";
import { PedidosPage } from "@/features/loja-pedidos/PedidosPage";

export const Route = createFileRoute("/_authenticated/loja/pedidos")({
  component: PedidosPage,
});
