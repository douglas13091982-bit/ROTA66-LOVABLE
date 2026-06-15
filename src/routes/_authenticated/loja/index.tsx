import { createFileRoute, redirect } from "@tanstack/react-router";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";

export const Route = createFileRoute("/_authenticated/loja/")({
  beforeLoad: () => {
    throw redirect({ to: "/loja/dashboard" });
  },
  errorComponent: ({ error, reset }) => <GlobalErrorBoundary error={error} reset={reset} />,
  notFoundComponent: () => <GlobalErrorBoundary statusCode={404} />,
});
