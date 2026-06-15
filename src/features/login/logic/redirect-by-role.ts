import type { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type NavigateFn = ReturnType<typeof useNavigate>;

/**
 * Lê os papéis do usuário e redireciona para a área correspondente.
 * Prioridade: super_admin/admin > entregador > loja_admin > cliente.
 */
export async function redirectByRole(userId: string, navigate: NavigateFn) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as string);
  if (roles.includes("super_admin") || roles.includes("admin")) {
    return navigate({ to: "/admin" });
  }
  if (roles.includes("entregador")) return navigate({ to: "/entregador" });
  if (roles.includes("loja_admin")) return navigate({ to: "/loja" });
  if (roles.includes("cliente")) return navigate({ to: "/clientes" });
  return navigate({ to: "/" });
}
