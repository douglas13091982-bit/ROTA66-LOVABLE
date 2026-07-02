import { createFileRoute } from "@tanstack/react-router";
import { AdminFranqueadosPage } from "@/features/admin-franqueados/AdminFranqueadosPage";

export const Route = createFileRoute("/_authenticated/admin/franqueados")({
  component: AdminFranqueadosPage,
});
