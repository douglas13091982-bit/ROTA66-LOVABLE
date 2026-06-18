import { createFileRoute } from "@tanstack/react-router";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { NotificacaoSomLojaPage } from "@/features/admin-notificacao-som/NotificacaoSomLojaPage";

export const Route = createFileRoute("/_authenticated/admin/notificacao-som-loja")({
  component: NotificacaoSomLojaPage,
  errorComponent: ({ error, reset }) => <GlobalErrorBoundary error={error} reset={reset} />,
  notFoundComponent: () => <GlobalErrorBoundary statusCode={404} />,
});
