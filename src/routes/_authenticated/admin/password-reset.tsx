import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/password-reset")({
  beforeLoad: () => { throw redirect({ to: "/admin/dashboard" }); },
});
