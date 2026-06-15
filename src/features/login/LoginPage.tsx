import { Link } from "@tanstack/react-router";
import { AuthCard } from "@/components/AuthCard";
import { LoginForm } from "./components/LoginForm";
import { useLoginSubmit } from "./logic/use-login-submit";

export function LoginPage() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    handleEmailLogin,
  } = useLoginSubmit();

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
      <LoginForm
        email={email}
        password={password}
        loading={loading}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={handleEmailLogin}
      />
    </AuthCard>
  );
}
