import type { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type NavigateFn = ReturnType<typeof useNavigate>;

export async function redirectByRole(userId: string, navigate: NavigateFn) {
  const { data: rolesData } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (rolesData ?? []).map((r) => r.role as string);

  if (roles.includes("super_admin") || roles.includes("admin")) {
    return navigate({ to: "/admin", replace: true });
  }

  if (roles.includes("entregador")) {
    return navigate({ to: "/entregador", replace: true });
  }

  return navigate({ to: "/", replace: true });
}
