import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/roteirizacao")({
  beforeLoad: () => { throw redirect({ to: "/admin/dashboard" }); },
});
