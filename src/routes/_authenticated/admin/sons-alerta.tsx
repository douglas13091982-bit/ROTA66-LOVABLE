import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/sons-alerta")({
  beforeLoad: () => { throw redirect({ to: "/admin/dashboard" }); },
});
