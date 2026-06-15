import { createFileRoute } from "@tanstack/react-router";
import { FinanceiroAdminPage } from "@/features/admin-financeiro/FinanceiroAdminPage";

export const Route = createFileRoute("/_authenticated/admin/financeiro")({
  component: FinanceiroAdminPage,
});
