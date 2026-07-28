import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { garantirSessaoValida } from "@/lib/auth-session";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";

/**
 * Centraliza roles + flag de colaborador de franqueado para que TODOS os
 * sub-layouts e componentes leiam a mesma fonte de verdade.
 */
async function carregarContexto(user: User) {
  const [{ data: rolesData }, { data: colab }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    (supabase as any)
      .from("franqueado_colaboradores")
      .select("id")
      .eq("colaborador_user_id", user.id)
      .eq("ativo", true)
      .maybeSingle(),
  ]);
  const roles = (rolesData ?? []).map((r) => r.role as string);
  const isFranqueadoColaborador = !!colab;
  if (isFranqueadoColaborador && !roles.includes("franqueado_colaborador")) {
    roles.push("franqueado_colaborador");
  }
  return { user, roles, isFranqueadoColaborador };
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // `garantirSessaoValida` renova o token proativamente e distingue
    // "sem sessão" de "falha de rede". Antes, qualquer oscilação de rede
    // na renovação derrubava o usuário para o login — era isso que fazia
    // o painel da loja deslogar sozinho depois de um tempo aberto.
    const resultado = await garantirSessaoValida();

    if (resultado === "rede") {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) throw redirect({ to: "/login" });
      return carregarContexto(data.session.user);
    }

    if (!resultado?.user) throw redirect({ to: "/login" });
    return carregarContexto(resultado.user);
  },

  errorComponent: ({ error, reset }) => <GlobalErrorBoundary error={error} reset={reset} />,
  notFoundComponent: () => <GlobalErrorBoundary statusCode={404} />,
  component: () => <Outlet />,
});
