import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/revendedor/")({
  beforeLoad: () => {
    throw redirect({ to: "/revendedor/lojas" });
  },
});
