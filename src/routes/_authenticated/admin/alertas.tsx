import { createFileRoute } from "@tanstack/react-router";
import { AdminAlertasPage } from "@/features/admin-alertas/AdminAlertasPage";

export const Route = createFileRoute("/_authenticated/admin/alertas")({
  component: AdminAlertasPage,
});
