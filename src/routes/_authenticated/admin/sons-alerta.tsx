import { createFileRoute } from "@tanstack/react-router";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { SomAlertaAdminPage } from "@/features/admin-notificacao-som/SomAlertaAdminPage";

export const Route = createFileRoute("/_authenticated/admin/sons-alerta")({
  component: SomAlertaAdminPage,
  errorComponent: ({ error, reset }) => <GlobalErrorBoundary error={error} reset={reset} />,
  notFoundComponent: () => <GlobalErrorBoundary statusCode={404} />,
});
