import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthCard, AuthPasswordInput, PrimaryButton } from "@/components/AuthCard";
import { supabase } from "@/integrations/supabase/client";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { redefinirSenhaComToken } from "@/lib/password-reset.functions";

type Search = { token?: string };

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = useSearch({ from: "/reset-password" }) as Search;
  const [ready, setReady] = useState(false);
  const [valid, setValid] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) {
        setErrorMsg(
          "Link inválido. Solicite uma nova redefinição em \"Esqueci minha senha\" na tela de login.",
        );
        setReady(true);
        return;
      }
      const { data, error } = await supabase.rpc("validar_token_reset" as any, {
        _token: token,
      });
      if (!alive) return;
      if (error) {
        setErrorMsg(error.message);
      } else {
        const res = data as any;
        if (res?.ok) {
          setValid(true);
          setEmailHint(res.email ?? null);
        } else {
          setErrorMsg(res?.message ?? "Link inválido.");
        }
      }
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const regras = [
    { label: "Mínimo de 8 caracteres", ok: password.length >= 8 },
    { label: "Pelo menos 1 letra maiúscula", ok: /[A-Z]/.test(password) },
    { label: "Pelo menos 1 letra minúscula", ok: /[a-z]/.test(password) },
    { label: "Pelo menos 1 número", ok: /\d/.test(password) },
    { label: "Sem espaços", ok: password.length > 0 && !/\s/.test(password) },
  ];
  const senhaValida = regras.every((r) => r.ok);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!senhaValida) {
      toast.error("A senha não atende aos requisitos indicados.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não conferem.");
      return;
    }
    setLoading(true);
    try {
      await redefinirSenhaComToken({ data: { token, password } });
      toast.success("Senha atualizada com sucesso! Faça login.");
      await supabase.auth.signOut().catch(() => {});
      navigate({ to: "/login" });
    } catch (err: any) {
      toast.error(err?.message ?? "Não foi possível redefinir a senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="NOVA SENHA"
      subtitle={
        valid
          ? `Defina uma nova senha${emailHint ? ` para ${emailHint}` : ""}.`
          : "Use o link liberado pelo administrador para redefinir sua senha."
      }
    >
      {!ready ? (
        <p className="text-sm text-muted-foreground">Validando link...</p>
      ) : !valid ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <PrimaryButton type="button" onClick={() => navigate({ to: "/login" })}>
            Voltar para login
          </PrimaryButton>
        </div>
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

          <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              A senha deve conter:
            </p>
            <ul className="space-y-1">
              {regras.map((r) => (
                <li
                  key={r.label}
                  className={`flex items-center gap-2 text-xs ${r.ok ? "text-emerald-400" : "text-muted-foreground"}`}
                >
                  <span aria-hidden>{r.ok ? "✓" : "•"}</span>
                  {r.label}
                </li>
              ))}
            </ul>
          </div>

          <AuthPasswordInput
            label="Confirmar senha"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />
          {confirm.length > 0 && confirm !== password && (
            <p className="mb-3 text-xs text-red-400">As senhas não conferem.</p>
          )}
          <PrimaryButton type="submit" disabled={loading || !senhaValida || password !== confirm}>
            {loading ? "Salvando..." : "Salvar nova senha"}
          </PrimaryButton>
        </form>
      )}
    </AuthCard>
  );
}


export const Route = createFileRoute("/reset-password")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): Search => ({
    token: typeof s.token === "string" ? s.token : undefined,
  }),
  head: () => ({ meta: [{ title: "Redefinir senha — ROTA 66" }] }),
  errorComponent: ({ error, reset }) => <GlobalErrorBoundary error={error} reset={reset} />,
  notFoundComponent: () => <GlobalErrorBoundary statusCode={404} />,
  component: ResetPasswordPage,
});
