import { createFileRoute } from "@tanstack/react-router";
import { AdminRevendedoresPage } from "@/features/admin-revendedores/AdminRevendedoresPage";

export const Route = createFileRoute("/_authenticated/admin/revendedores")({
  component: AdminRevendedoresPage,
});
