import { createFileRoute } from "@tanstack/react-router";
import { TurnosEntregadorPage } from "@/features/entregador-turnos/TurnosEntregadorPage";

export const Route = createFileRoute("/_authenticated/entregador/turnos")({
  component: TurnosEntregadorPage,
});
