import { createFileRoute } from "@tanstack/react-router";
import { AdminDespesasPage } from "@/features/admin-despesas/AdminDespesasPage";

export const Route = createFileRoute("/_authenticated/admin/despesas")({
  component: AdminDespesasPage,
});
