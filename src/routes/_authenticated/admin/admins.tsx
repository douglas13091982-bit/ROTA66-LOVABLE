import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/admins")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/dashboard" });
  },
});
