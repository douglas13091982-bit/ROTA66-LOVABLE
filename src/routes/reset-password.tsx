import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthCard, AuthPasswordInput, PrimaryButton } from "@/components/AuthCard";
import { supabase } from "@/integrations/supabase/client";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase processa o hash (#access_token=...&type=recovery) automaticamente
    // e dispara PASSWORD_RECOVERY. Também verificamos a sessão atual.
    const sub = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasSession(true);
      }
      setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setHasSession(true);
      setReady(true);
    });
    return () => sub.data.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha precisa ter ao menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não conferem.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Senha atualizada com sucesso!");
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  return (
    <AuthCard
      title="NOVA SENHA"
      subtitle={
        hasSession
          ? "Defina uma nova senha para sua conta."
          : "Abra o link de redefinição enviado para seu e-mail."
      }
    >
      {!ready ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : !hasSession ? (
        <p className="text-sm text-muted-foreground">
          Link inválido ou expirado. Volte para o login e solicite um novo link
          em "Esqueci minha senha".
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          <AuthPasswordInput
            label="Nova senha"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />
          <AuthPasswordInput
            label="Confirmar senha"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Salvar nova senha"}
          </PrimaryButton>
        </form>
      )}
    </AuthCard>
  );
}

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Redefinir senha — ROTA 66" }] }),
  errorComponent: ({ error, reset }) => <GlobalErrorBoundary error={error} reset={reset} />,
  notFoundComponent: () => <GlobalErrorBoundary statusCode={404} />,
  component: ResetPasswordPage,
});
