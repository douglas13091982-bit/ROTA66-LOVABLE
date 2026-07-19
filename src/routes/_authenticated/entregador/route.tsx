import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";

export const Route = createFileRoute("/_authenticated/entregador")({
  beforeLoad: async ({ context }) => {
    const ctx = context as { user?: { id: string }; roles?: string[] };
    const userId = ctx.user?.id;
    if (!userId) throw redirect({ to: "/login" });

    // Reaproveita as roles já carregadas pelo layout _authenticated;
    // fallback à query caso o context não venha preenchido (defensivo).
    let list = ctx.roles;
    if (!list) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      list = (roles ?? []).map((r) => r.role as string);
    }

    if (list.includes("entregador")) return;

    // Não é entregador: manda para a área compatível com o papel real.
    if (list.includes("super_admin") || list.includes("admin")) throw redirect({ to: "/admin" });
    if (list.includes("loja_admin")) throw redirect({ to: "/loja" });
    if (list.includes("cliente")) throw redirect({ to: "/clientes" });
    throw redirect({ to: "/" });
  },
  errorComponent: ({ error, reset }) => <GlobalErrorBoundary error={error} reset={reset} />,
  notFoundComponent: () => <GlobalErrorBoundary statusCode={404} />,
  component: () => <Outlet />,
});
