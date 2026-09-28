import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { normalizeBrPhone, onlyDigits } from "@/lib/format/document";
import type { Role } from "./roles";
import type { SignupForm } from "./use-signup-form";
import { buildSignupMetadata, mapSignupError, validateSignup } from "./validation";

type Deps = {
  role: Role | null;
  form: SignupForm;
  contratoLoading: boolean;
  contratoAtivo?: { id: string; versao: number } | null;
  indicadorId?: string | null;
  indicadorTipo?: "entregador" | null;
  redirectTo?: string;
};

export function useSignupSubmit({ role, form, contratoLoading, contratoAtivo, indicadorId, redirectTo }: Deps) {
  const navigate = useNavigate();

  async function checarCpfDisponivel(cpfDigits: string): Promise<boolean> {
    const { data, error } = await supabase.rpc("cpf_disponivel", { _cpf: cpfDigits });
    if (error) {
      toast.error("Não foi possível validar o CPF. Tente novamente.");
      return false;
    }
    if (!data) {
      toast.error("Este CPF já está cadastrado.");
      return false;
    }
    return true;
  }

  async function uploadAvatar(userId: string, file: File) {
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (error) throw error;
      await supabase.from("profiles").update({ avatar_url: path }).eq("id", userId);
    } catch (err: any) {
      toast.error("Conta criada, mas não foi possível enviar a foto: " + (err.message ?? "erro"));
    }
  }

  async function garantirSessao() {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;
    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    if (error || !signInData.session) return null;
    return signInData.session;
  }

  async function submit() {
    if (role !== "entregador") return;
    if (!validateSignup({ role, form, contratoLoading, contratoId: contratoAtivo?.id })) return;

    const cpfDigits = onlyDigits(form.cpf);
    if (!(await checarCpfDisponivel(cpfDigits))) return;

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: buildSignupMetadata("entregador", form),
      },
    });

    if (error) {
      toast.error(mapSignupError(error.message, true));
      return;
    }

    if (form.avatarFile && signUpData.session?.user) {
      await uploadAvatar(signUpData.session.user.id, form.avatarFile);
    }

    let session = signUpData.session;
    if (!session) {
      session = await garantirSessao();
      if (!session) {
        toast.success("Conta criada! Confirme seu e-mail para concluir o cadastro.");
        navigate({ to: "/login" });
        return;
      }
    }

    toast.success("Cadastro de entregador concluído!");
    navigate({ to: redirectTo || "/entregador", replace: true });
  }

  async function loginGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com Google");
      return { ok: false as const };
    }
    if (result.redirected) return { ok: true as const, redirected: true };
    navigate({ to: "/" });
    return { ok: true as const, redirected: false };
  }

  return { submit, loginGoogle };
}
