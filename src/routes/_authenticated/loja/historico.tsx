import { createFileRoute } from "@tanstack/react-router";
import { HistoricoPage } from "@/features/loja-historico/HistoricoPage";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";

export const Route = createFileRoute("/_authenticated/loja/historico")({
  component: HistoricoPage,
  errorComponent: ({ error, reset }) => <GlobalErrorBoundary error={error} reset={reset} />,
  notFoundComponent: () => <GlobalErrorBoundary statusCode={404} />,
});
