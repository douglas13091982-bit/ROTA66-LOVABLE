import { createFileRoute } from "@tanstack/react-router";
import { AgendamentosPage } from "@/features/agendamentos/AgendamentosPage";

export const Route = createFileRoute("/_authenticated/loja/agendamentos")({
  component: AgendamentosPage,
});
