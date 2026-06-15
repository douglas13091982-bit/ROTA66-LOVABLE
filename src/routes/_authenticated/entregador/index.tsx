import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/entregador/")({
  beforeLoad: () => {
    throw redirect({ to: "/entregador/disponiveis" });
  },
});
