import { createFileRoute } from "@tanstack/react-router";
import { HistoricoPage } from "@/features/entregador-historico/HistoricoPage";

export const Route = createFileRoute("/_authenticated/entregador/historico")({
  component: HistoricoPage,
});
