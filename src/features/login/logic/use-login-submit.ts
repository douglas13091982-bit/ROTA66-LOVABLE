import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { redirectByRole } from "./redirect-by-role";

/**
 * Encapsula o estado do formulário e os fluxos de autenticação
 * (e-mail/senha e Google OAuth via Lovable).
 */
export function useLoginSubmit(redirectTo?: string) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Bem-vindo de volta!");
    if (redirectTo) {
      navigate({ to: redirectTo, replace: true });
      return;
    }
    if (data.user) await redirectByRole(data.user.id, navigate);
    else navigate({ to: "/" });
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com Google");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: redirectTo ?? "/" });
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    handleEmailLogin,
    handleGoogle,
  };
}
