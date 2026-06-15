import { createFileRoute } from "@tanstack/react-router";
import { ContratosPage } from "@/features/admin-contratos/ContratosPage";

export const Route = createFileRoute("/_authenticated/admin/contratos")({
  component: ContratosPage,
});
