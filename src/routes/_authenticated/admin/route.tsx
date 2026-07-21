import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: ({ context }) => {
    const ctx = context as {
      user?: { id: string };
      roles?: string[];
      isFranqueadoColaborador?: boolean;
    };
    const userId = ctx.user?.id;
    if (!userId) throw redirect({ to: "/login" });

    const list = ctx.roles ?? [];
    const colab = !!ctx.isFranqueadoColaborador;

    if (list.includes("super_admin") || list.includes("admin") || colab) return;
    if (list.includes("loja_admin")) throw redirect({ to: "/loja" });
    if (list.includes("entregador")) throw redirect({ to: "/entregador" });
    if (list.includes("cliente")) throw redirect({ to: "/clientes" });
    throw redirect({ to: "/" });
  },
  errorComponent: ({ error, reset }) => <GlobalErrorBoundary error={error} reset={reset} />,
  notFoundComponent: () => <GlobalErrorBoundary statusCode={404} />,
  component: () => <Outlet />,
});
