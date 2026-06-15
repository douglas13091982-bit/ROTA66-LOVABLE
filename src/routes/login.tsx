import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { AuthCard, AuthInput, AuthPasswordInput, PrimaryButton, GoogleButton } from "@/components/AuthCard";
import { sanitizeEmail } from "@/lib/sanitize";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — ROTA 66" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectByRole = async (userId: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const roles = (data ?? []).map((r) => r.role as string);
    if (roles.includes("super_admin") || roles.includes("admin")) return navigate({ to: "/admin" });
    if (roles.includes("entregador")) return navigate({ to: "/entregador" });
    if (roles.includes("loja_admin")) return navigate({ to: "/loja" });
    if (roles.includes("cliente")) return navigate({ to: "/clientes" });
    return navigate({ to: "/" });
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Bem-vindo de volta!");
    if (data.user) await redirectByRole(data.user.id);
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
    navigate({ to: "/" });
  };

  return (
    <AuthCard
      title="ACELERA"
      subtitle="Entre na sua conta para continuar"
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link to="/cadastro" className="text-primary font-bold hover:underline">
            Cadastre-se
          </Link>
        </>
      }
    >
      <form onSubmit={handleEmailLogin}>
        <AuthInput
          label="E-mail"
          type="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(sanitizeEmail(e.target.value))}
          maxLength={254}
          autoComplete="email"
          placeholder="voce@exemplo.com"
        />
        <AuthPasswordInput
          label="Senha"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </PrimaryButton>
      </form>
    </AuthCard>
  );
}
