import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/branding")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/dashboard" });
  },
});
