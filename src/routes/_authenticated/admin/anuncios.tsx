import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/anuncios")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/dashboard" });
  },
});
