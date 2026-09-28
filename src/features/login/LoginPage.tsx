import { Link, useSearch } from "@tanstack/react-router";
import { AuthCard } from "@/components/AuthCard";
import { LoginForm } from "./components/LoginForm";
import { useLoginSubmit } from "./logic/use-login-submit";

export function LoginPage() {
  const { redirect } = useSearch({ from: "/login" }) as { redirect?: string };
  const { email, setEmail, password, setPassword, loading, handleEmailLogin } = useLoginSubmit(redirect);
  const cadastroSearch = redirect ? { redirect } : {};

  return (
    <AuthCard
      title="ACESSAR ROTA 66"
      subtitle="Entre no painel de logística"
      footer={
        <>
          Ainda não é entregador?{" "}
          <Link to="/cadastro" search={cadastroSearch} className="text-primary font-bold hover:underline">Cadastre-se como entregador</Link>
        </>
      }
    >
      <LoginForm email={email} password={password} loading={loading} onEmailChange={setEmail} onPasswordChange={setPassword} onSubmit={handleEmailLogin} />
    </AuthCard>
  );
}
