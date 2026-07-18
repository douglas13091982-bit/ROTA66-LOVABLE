import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";

export const Route = createFileRoute("/_authenticated/loja")({
  beforeLoad: async ({ context }) => {
    const userId = (context as any).user?.id;
    if (!userId) throw redirect({ to: "/login" });

    const [{ data: roles }, { data: colab }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      (supabase as any)
        .from("franqueado_colaboradores")
        .select("id")
        .eq("colaborador_user_id", userId)
        .eq("ativo", true)
        .maybeSingle(),
    ]);

    const list = (roles ?? []).map((r) => r.role as string);

    if (list.includes("loja_admin")) return;

    // Admins e colaboradores de franqueado podem acessar em "modo suporte".
    const podeSuporte =
      list.includes("super_admin") || list.includes("admin") || !!colab;
    const suporteAtivo =
      typeof window !== "undefined" &&
      !!window.sessionStorage.getItem("admin:loja_suporte_id");
    if (podeSuporte && suporteAtivo) return;

    // Não é loja: manda para a área compatível com o papel real.
    if (podeSuporte) throw redirect({ to: "/admin" });
    if (list.includes("entregador")) throw redirect({ to: "/entregador" });
    if (list.includes("cliente")) throw redirect({ to: "/clientes" });
    throw redirect({ to: "/" });
  },
  errorComponent: ({ error, reset }) => <GlobalErrorBoundary error={error} reset={reset} />,
  notFoundComponent: () => <GlobalErrorBoundary statusCode={404} />,
  component: () => <Outlet />,
});
