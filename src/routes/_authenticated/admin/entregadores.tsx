import { createFileRoute } from "@tanstack/react-router";
import { AdminEntregadoresPage } from "@/features/admin-entregadores/AdminEntregadoresPage";

export const Route = createFileRoute("/_authenticated/admin/entregadores")({
  component: AdminEntregadoresPage,
});
