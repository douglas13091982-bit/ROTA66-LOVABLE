import { createFileRoute } from "@tanstack/react-router";
import { MensalidadePage } from "@/features/entregador-mensalidade/MensalidadePage";

export const Route = createFileRoute("/_authenticated/entregador/mensalidade")({
  component: MensalidadePage,
});
