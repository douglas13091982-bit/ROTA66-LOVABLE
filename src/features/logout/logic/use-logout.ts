import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Higiene de sign-out em ordem (ver TanStack auth-guards):
 *   1. cancelQueries — evita 401s de queries em voo após o signOut
 *   2. queryClient.clear() — descarta cache protegido
 *   3. supabase.auth.signOut() — limpa a sessão
 *   4. navigate(..., replace) — tira a rota protegida da pilha do back
 *
 * Pular qualquer passo vaza estado protegido ou cria storm de 401s.
 */
export function useLogout(options?: { redirectTo?: "/login" | "/" }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const redirectTo = options?.redirectTo ?? "/login";

  const signOut = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      navigate({ to: redirectTo, replace: true });
    } finally {
      setLoading(false);
    }
  };

  return { signOut, loading };
}
