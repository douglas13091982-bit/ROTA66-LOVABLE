import { createFileRoute } from "@tanstack/react-router";
import { AdminTarifasPage } from "@/features/admin-tarifas/AdminTarifasPage";

export const Route = createFileRoute("/_authenticated/admin/tarifas")({
  component: AdminTarifasPage,
});
