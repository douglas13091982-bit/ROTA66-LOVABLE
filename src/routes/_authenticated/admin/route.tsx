import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: ({ context }) => {
    const ctx = context as { user?: { id: string }; roles?: string[] };
    if (!ctx.user?.id) throw redirect({ to: "/login" });

    const list = ctx.roles ?? [];
    if (list.includes("super_admin") || list.includes("admin")) return;
    if (list.includes("entregador")) throw redirect({ to: "/entregador" });
    throw redirect({ to: "/" });
  },
  errorComponent: ({ error, reset }) => <GlobalErrorBoundary error={error} reset={reset} />,
  notFoundComponent: () => <GlobalErrorBoundary statusCode={404} />,
  component: () => <Outlet />,
});
