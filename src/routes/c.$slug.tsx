import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/c/$slug")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
