import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";

export const Route = createFileRoute("/_authenticated/revendedor")({
  beforeLoad: async ({ context }) => {
    const userId = (context as any).user?.id;
    if (!userId) throw redirect({ to: "/login" });

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const list = (roles ?? []).map((r) => r.role as string);

    if (list.includes("revendedor") || list.includes("super_admin")) return;

    if (list.includes("admin")) throw redirect({ to: "/admin" });
    if (list.includes("loja_admin")) throw redirect({ to: "/loja" });
    if (list.includes("entregador")) throw redirect({ to: "/entregador" });
    if (list.includes("cliente")) throw redirect({ to: "/clientes" });
    throw redirect({ to: "/" });
  },
  errorComponent: ({ error, reset }) => <GlobalErrorBoundary error={error} reset={reset} />,
  notFoundComponent: () => <GlobalErrorBoundary statusCode={404} />,
  component: () => <Outlet />,
});
