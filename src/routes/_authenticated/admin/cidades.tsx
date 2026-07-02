import { createFileRoute } from "@tanstack/react-router";
import { AdminCidadesPage } from "@/features/admin-cidades/AdminCidadesPage";

export const Route = createFileRoute("/_authenticated/admin/cidades")({
  component: AdminCidadesPage,
});
