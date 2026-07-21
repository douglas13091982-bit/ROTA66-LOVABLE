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

    // Centraliza roles + flag de colaborador de franqueado aqui para que
    // TODOS os sub-layouts e componentes leiam a mesma fonte de verdade
    // (evita UI escondida para colaboradores com acesso efetivo).
    const [{ data: rolesData }, { data: colab }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", session.user.id),
      (supabase as any)
        .from("franqueado_colaboradores")
        .select("id")
        .eq("colaborador_user_id", session.user.id)
        .eq("ativo", true)
        .maybeSingle(),
    ]);
    const roles = (rolesData ?? []).map((r) => r.role as string);
    const isFranqueadoColaborador = !!colab;
    // Injeta role sintética para que checagens `roles.includes(...)` em
    // componentes vejam o colaborador de franqueado sem query adicional.
    if (isFranqueadoColaborador && !roles.includes("franqueado_colaborador")) {
      roles.push("franqueado_colaborador");
    }

    return { user: session.user, roles, isFranqueadoColaborador };
  },
  errorComponent: ({ error, reset }) => <GlobalErrorBoundary error={error} reset={reset} />,
  notFoundComponent: () => <GlobalErrorBoundary statusCode={404} />,
  component: () => <Outlet />,
});
