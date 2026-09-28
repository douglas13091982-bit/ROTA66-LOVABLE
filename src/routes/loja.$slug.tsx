import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/loja/$slug")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
