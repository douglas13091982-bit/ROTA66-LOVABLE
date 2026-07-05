import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";

export const Route = createFileRoute("/_authenticated/loja")({
  beforeLoad: async ({ context }) => {
    const userId = (context as any).user?.id;
    if (!userId) throw redirect({ to: "/login" });

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const list = (roles ?? []).map((r) => r.role as string);

    if (list.includes("loja_admin")) return;

    // Admins podem acessar o painel da loja em "modo suporte".
    const ehAdmin = list.includes("super_admin") || list.includes("admin");
    const suporteAtivo =
      typeof window !== "undefined" &&
      !!window.sessionStorage.getItem("admin:loja_suporte_id");
    if (ehAdmin && suporteAtivo) return;

    // Não é loja: manda para a área compatível com o papel real.
    if (ehAdmin) throw redirect({ to: "/admin" });
    if (list.includes("entregador")) throw redirect({ to: "/entregador" });
    if (list.includes("cliente")) throw redirect({ to: "/clientes" });
    throw redirect({ to: "/" });
  },
  errorComponent: ({ error, reset }) => <GlobalErrorBoundary error={error} reset={reset} />,
  notFoundComponent: () => <GlobalErrorBoundary statusCode={404} />,
  component: () => <Outlet />,
});
