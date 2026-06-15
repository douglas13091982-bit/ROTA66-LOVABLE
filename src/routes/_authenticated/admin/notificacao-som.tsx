import { createFileRoute } from "@tanstack/react-router";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { NotificacaoSomPage } from "@/features/admin-notificacao-som/NotificacaoSomPage";

export const Route = createFileRoute("/_authenticated/admin/notificacao-som")({
  component: NotificacaoSomPage,
  errorComponent: ({ error, reset }) => <GlobalErrorBoundary error={error} reset={reset} />,
  notFoundComponent: () => <GlobalErrorBoundary statusCode={404} />,
});
