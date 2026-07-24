import { createFileRoute } from "@tanstack/react-router";
import { MapaEntregadoresAdminPage } from "@/features/admin-mapa/MapaEntregadoresAdminPage";

export const Route = createFileRoute("/_authenticated/admin/mapa")({
  component: MapaEntregadoresAdminPage,
});
