import { createFileRoute } from "@tanstack/react-router";
import { ClientesPushPage } from "@/features/admin-clientes-push/ClientesPushPage";

export const Route = createFileRoute("/_authenticated/admin/clientes-push")({
  component: ClientesPushPage,
});
