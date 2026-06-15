import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

/**
 * Redireciona um usuário logado para o painel correto conforme o papel.
 * Só age depois que `roles` carregaram — evita mandar todo mundo para
 * /entregador antes de saber o papel real.
 */
export function useAutoRedirectByRole() {
  const navigate = useNavigate();
  const { user, roles, loading } = useAuth();

  useEffect(() => {
    if (loading || !user || roles.length === 0) return;
    if (roles.includes("super_admin") || roles.includes("admin")) navigate({ to: "/admin" });
    else if (roles.includes("loja_admin")) navigate({ to: "/loja" });
    else if (roles.includes("entregador")) navigate({ to: "/entregador" });
  }, [user, roles, loading, navigate]);
}
