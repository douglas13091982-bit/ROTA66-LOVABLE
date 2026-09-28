import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/notificacoes")({
  beforeLoad: () => { throw redirect({ to: "/admin/dashboard" }); },
});
