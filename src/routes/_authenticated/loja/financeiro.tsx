import { createFileRoute } from "@tanstack/react-router";
import { FinanceiroPage } from "@/features/loja-financeiro/FinanceiroPage";

export const Route = createFileRoute("/_authenticated/loja/financeiro")({
  component: FinanceiroPage,
});
