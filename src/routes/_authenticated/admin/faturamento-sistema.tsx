import { createFileRoute } from "@tanstack/react-router";
import { FaturamentoSistemaPage } from "@/features/admin-faturamento-sistema/FaturamentoSistemaPage";

export const Route = createFileRoute(
  "/_authenticated/admin/faturamento-sistema",
)({
  component: FaturamentoSistemaPage,
});
