import { createFileRoute } from "@tanstack/react-router";
import { EntregadoresPage } from "@/features/loja-entregadores/EntregadoresPage";

export const Route = createFileRoute("/_authenticated/loja/entregadores")({
  component: EntregadoresPage,
});
