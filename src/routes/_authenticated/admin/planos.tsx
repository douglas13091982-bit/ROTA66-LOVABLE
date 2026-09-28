import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/planos")({
  beforeLoad: () => { throw redirect({ to: "/admin/dashboard" }); },
});
