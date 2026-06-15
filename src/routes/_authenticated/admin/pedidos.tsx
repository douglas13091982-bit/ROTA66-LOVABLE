import { createFileRoute } from "@tanstack/react-router";
import { AdminPedidosPage } from "@/features/admin-pedidos/AdminPedidosPage";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({
  component: AdminPedidosPage,
});
