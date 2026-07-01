import { createFileRoute } from "@tanstack/react-router";
import { AdminSaquesRevendedoresPage } from "@/features/admin-saques-revendedores/AdminSaquesRevendedoresPage";

export const Route = createFileRoute("/_authenticated/admin/saques-revendedores")({
  component: AdminSaquesRevendedoresPage,
});
