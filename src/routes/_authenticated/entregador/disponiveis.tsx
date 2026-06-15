import { createFileRoute } from "@tanstack/react-router";
import { DisponiveisPage } from "@/features/entregador-disponiveis/DisponiveisPage";

export const Route = createFileRoute("/_authenticated/entregador/disponiveis")({
  component: DisponiveisPage,
});
