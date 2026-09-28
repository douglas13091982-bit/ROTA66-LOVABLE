import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export function useAutoRedirectByRole() {
  const navigate = useNavigate();
  const { user, roles, loading } = useAuth();

  useEffect(() => {
    if (loading || !user || roles.length === 0) return;
    if (roles.includes("super_admin") || roles.includes("admin")) navigate({ to: "/admin" });
    else if (roles.includes("entregador")) navigate({ to: "/entregador" });
    else navigate({ to: "/" });
  }, [user, roles, loading, navigate]);
}
