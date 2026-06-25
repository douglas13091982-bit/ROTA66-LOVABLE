import {
  AuthInput,
  AuthPasswordInput,
  PrimaryButton,
} from "@/components/AuthCard";
import { sanitizeEmail } from "@/lib/sanitize";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  const [sendingReset, setSendingReset] = useState(false);

  async function handleForgot() {
    const target = email.trim();
    if (!target) {
      toast.error("Digite seu e-mail no campo acima para receber o link.");
      return;
    }
    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSendingReset(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Enviamos um link de redefinição para seu e-mail.");
  }

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
      <div className="-mt-2 mb-5 flex justify-end">
        <button
          type="button"
          onClick={handleForgot}
          disabled={sendingReset}
          className="text-xs font-bold uppercase tracking-[0.18em] text-primary hover:underline disabled:opacity-50"
        >
          {sendingReset ? "Enviando..." : "Esqueci minha senha"}
        </button>
      </div>
      <PrimaryButton type="submit" disabled={loading}>
        {loading ? "Entrando..." : "Entrar"}
      </PrimaryButton>
    </form>
  );
}
