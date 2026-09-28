import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/lojas")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/entregadores" });
  },
});
