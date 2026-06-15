import { createFileRoute } from "@tanstack/react-router";
import { CarteiraPage } from "@/features/entregador-carteira/CarteiraPage";

export const Route = createFileRoute("/_authenticated/entregador/carteira")({
  component: CarteiraPage,
});
