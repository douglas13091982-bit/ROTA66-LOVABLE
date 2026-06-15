import { createFileRoute } from "@tanstack/react-router";
import { CreditosEntregadorPage } from "@/features/admin-creditos-entregador/CreditosEntregadorPage";

export const Route = createFileRoute("/_authenticated/admin/creditos-entregador")({
  component: CreditosEntregadorPage,
});
