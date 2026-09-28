import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/entregadores" });
  },
});
