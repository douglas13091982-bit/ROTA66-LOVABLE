import {
  AuthInput,
  AuthPasswordInput,
  PrimaryButton,
} from "@/components/AuthCard";
import { sanitizeEmail } from "@/lib/sanitize";

interface LoginFormProps {
  email: string;
  password: string;
  loading: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function LoginForm({
  email,
  password,
  loading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginFormProps) {
  return (
    <form onSubmit={onSubmit}>
      <AuthInput
        label="E-mail"
        type="email"
        inputMode="email"
        required
        value={email}
        onChange={(e) => onEmailChange(sanitizeEmail(e.target.value))}
        maxLength={254}
        autoComplete="email"
        placeholder="voce@exemplo.com"
      />
      <AuthPasswordInput
        label="Senha"
        required
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
        placeholder="••••••••"
      />
      <PrimaryButton type="submit" disabled={loading}>
        {loading ? "Entrando..." : "Entrar"}
      </PrimaryButton>
    </form>
  );
}
