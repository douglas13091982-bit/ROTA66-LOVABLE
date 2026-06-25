import { createFileRoute } from "@tanstack/react-router";
import { AdminPasswordResetPage } from "@/features/admin-password-reset/AdminPasswordResetPage";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";

export const Route = createFileRoute("/_authenticated/admin/password-reset")({
  head: () => ({ meta: [{ title: "Redefinições de senha" }] }),
  errorComponent: ({ error, reset }) => <GlobalErrorBoundary error={error} reset={reset} />,
  notFoundComponent: () => <GlobalErrorBoundary statusCode={404} />,
  component: AdminPasswordResetPage,
});
