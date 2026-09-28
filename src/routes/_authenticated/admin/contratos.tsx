import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/contratos")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/dashboard" });
  },
});
