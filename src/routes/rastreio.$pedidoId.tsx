import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/rastreio/$pedidoId")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
