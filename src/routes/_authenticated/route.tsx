import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Usamos getSession() (local + auto-refresh via refresh_token) em vez de
    // getUser() (chamada de rede a cada navegação). Isso evita que uma
    // falha momentânea de rede — muito comum quando o app do entregador
    // ficou em segundo plano e volta com o token vencido — derrube o
    // usuário para a tela de login. Se não houver sessão local, tentamos
    // refresh explicitamente antes de redirecionar.
    let { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      session = refreshed.session ?? null;
    }
    if (!session?.user) {
      throw redirect({ to: "/login" });
    }

    // Busca as roles uma única vez aqui e passa via context para que as
    // rotas filhas (ex.: /entregador) não precisem repetir a query.
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    const roles = (rolesData ?? []).map((r) => r.role as string);

    return { user: session.user, roles };
  },
  errorComponent: ({ error, reset }) => <GlobalErrorBoundary error={error} reset={reset} />,
  notFoundComponent: () => <GlobalErrorBoundary statusCode={404} />,
  component: () => <Outlet />,
});
