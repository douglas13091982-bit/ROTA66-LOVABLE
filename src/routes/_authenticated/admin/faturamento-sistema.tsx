import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/faturamento-sistema")({
  beforeLoad: () => { throw redirect({ to: "/admin/dashboard" }); },
});
