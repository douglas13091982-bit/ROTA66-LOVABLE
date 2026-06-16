import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";

export const getRouter = () => {
  // Cache compartilhado entre rotas: evita refetch ao trocar de página
  // dentro de uma "sessão" curta. Dados continuam vivos por 5min.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,        // 30s sem refetch automático
        gcTime: 5 * 60_000,       // mantém em memória por 5min
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Pré-carrega a rota no hover/focus do link (~50ms) e mantém
    // o resultado fresco por 30s para que o clique seja instantâneo.
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
    defaultPreloadStaleTime: 30_000,
    defaultErrorComponent: ({ error, reset }) => (
      <GlobalErrorBoundary error={error} reset={reset} />
    ),
    defaultNotFoundComponent: () => (
      <GlobalErrorBoundary statusCode={404} />
    ),
  });

  return router;
};
