import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/clientes/$cidade")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
