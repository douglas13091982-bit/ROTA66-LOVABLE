import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/creditos-entregador")({
  beforeLoad: () => { throw redirect({ to: "/admin/dashboard" }); },
});
