import { createFileRoute } from "@tanstack/react-router";
import { AdminPlanosPage } from "@/features/admin-planos/AdminPlanosPage";

export const Route = createFileRoute("/_authenticated/admin/planos")({
  component: AdminPlanosPage,
});
