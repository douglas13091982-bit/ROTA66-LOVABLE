import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: ({ error, reset }) => (
      <GlobalErrorBoundary error={error} reset={reset} />
    ),
    defaultNotFoundComponent: () => (
      <GlobalErrorBoundary statusCode={404} />
    ),
  });

  return router;
};
