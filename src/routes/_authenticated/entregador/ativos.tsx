import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AtivosPage } from "@/features/entregador-ativos/AtivosPage";

export const Route = createFileRoute("/_authenticated/entregador/ativos")({
  validateSearch: z.object({ destaque: z.string().uuid().optional() }),
  component: RouteComponent,
});

function RouteComponent() {
  const { destaque } = Route.useSearch();
  return <AtivosPage destaque={destaque} />;
}
