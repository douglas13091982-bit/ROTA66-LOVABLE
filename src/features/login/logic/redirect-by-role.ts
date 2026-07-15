import type { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type NavigateFn = ReturnType<typeof useNavigate>;

/**
 * Lê os papéis do usuário e redireciona para a área correspondente.
 * Prioridade: super_admin/admin > entregador > loja_admin > cliente.
 */
export async function redirectByRole(userId: string, navigate: NavigateFn) {
  const [{ data: rolesData }, { data: profile }, { data: colab }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("profiles").select("cidade, estado").eq("id", userId).maybeSingle(),
    (supabase as any)
      .from("franqueado_colaboradores")
      .select("id")
      .eq("colaborador_user_id", userId)
      .eq("ativo", true)
      .maybeSingle(),
  ]);

  const roles = (rolesData ?? []).map((r) => r.role as string);
  if (roles.includes("super_admin") || roles.includes("admin") || colab) {
    return navigate({ to: "/admin", replace: true });
  }
  if (roles.includes("revendedor")) return navigate({ to: "/revendedor", replace: true });
  if (roles.includes("entregador")) return navigate({ to: "/entregador", replace: true });
  if (roles.includes("loja_admin")) return navigate({ to: "/loja", replace: true });
  if (roles.includes("cliente")) {
    const cidade = String((profile as any)?.cidade ?? "").trim();
    const uf = String((profile as any)?.estado ?? "").trim().toUpperCase();

    if (cidade) {
      return navigate({
        to: "/clientes/$cidade",
        params: { cidade: encodeURIComponent(cidade) },
        search: uf ? { uf } : {},
        replace: true,
      });
    }

    return navigate({ to: "/clientes", replace: true });
  }
  return navigate({ to: "/clientes", replace: true });
}
