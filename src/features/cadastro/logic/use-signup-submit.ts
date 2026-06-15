import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { onlyDigits } from "@/lib/format/document";
import type { Role } from "./roles";
import type { SignupForm } from "./use-signup-form";
import {
  buildSignupMetadata,
  buildSlug,
  mapLojaInsertError,
  mapSignupError,
  validateSignup,
} from "./validation";

type ContratoAtivo = { id: string; versao: number } | null | undefined;

type Deps = {
  role: Role | null;
  form: SignupForm;
  contratoAtivo: ContratoAtivo;
  contratoLoading: boolean;
};

export function useSignupSubmit({ role, form, contratoAtivo, contratoLoading }: Deps) {
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
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      await supabase.from("profiles").update({ avatar_url: path }).eq("id", userId);
    } catch (err: any) {
      toast.error("Conta criada, mas não foi possível enviar a foto: " + (err.message ?? "erro"));
    }
  }

  async function criarLoja(userId: string): Promise<{ id: string } | null> {
    const cnpjDigits = onlyDigits(form.cnpj);
    const slug = buildSlug(form.nomeLoja);
    const { data, error } = await supabase
      .from("lojas")
      .insert({
        owner_id: userId,
        nome: form.nomeLoja.trim(),
        slug,
        cnpj: cnpjDigits,
        telefone: form.phone,
        categoria: form.categoria || null,
      } as any)
      .select("id")
      .single();
    if (error || !data?.id) {
      toast.error("Conta criada, mas não foi possível registrar a loja: " + mapLojaInsertError(error?.message ?? ""));
      return null;
    }
    return data;
  }

  async function registrarAceiteContrato(lojaId: string) {
    if (!contratoAtivo?.id) return;
    const { error } = await supabase.from("loja_aceites_contrato").insert({
      loja_id: lojaId,
      contrato_id: contratoAtivo.id,
      versao: contratoAtivo.versao,
      user_agent: navigator.userAgent.slice(0, 500),
      full_name_snapshot: form.fullName,
    });
    if (error) {
      toast.error(
        "Loja criada, mas o registro do aceite dos Termos falhou. Acesse o painel para refazer o aceite.",
      );
    }
  }

  async function garantirSessao(): Promise<{ user: { id: string } } | null> {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;
    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    if (error || !signInData.session) return null;
    return signInData.session;
  }

  async function submit(): Promise<{ loading: boolean }> {
    if (!role) return { loading: false };
    if (!validateSignup({ role, form, contratoLoading, contratoId: contratoAtivo?.id })) {
      return { loading: false };
    }
    const cpfDigits = onlyDigits(form.cpf);
    if (cpfDigits) {
      const ok = await checarCpfDisponivel(cpfDigits);
      if (!ok) return { loading: false };
    }

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: buildSignupMetadata(role, form),
      },
    });
    if (error) {
      toast.error(mapSignupError(error.message, !!cpfDigits));
      return { loading: false };
    }

    if (role === "entregador" && form.avatarFile && signUpData.session?.user) {
      await uploadAvatar(signUpData.session.user.id, form.avatarFile);
    }

    let session = signUpData.session;
    if (!session) {
      session = await garantirSessao();
      if (!session) {
        toast.success("Conta criada! Confirme seu e-mail para concluir o cadastro.");
        if (role === "loja_admin") {
          toast.message("Após confirmar o e-mail, faça login para registrar os dados da sua loja.");
        }
        navigate({ to: "/login" });
        return { loading: false };
      }
    }

    if (role === "loja_admin" && session?.user) {
      const loja = await criarLoja(session.user.id);
      if (!loja) return { loading: false };
      await registrarAceiteContrato(loja.id);
      toast.success("Loja criada com sucesso!");
      navigate({ to: "/loja" });
      return { loading: false };
    }

    toast.success("Conta criada com sucesso!");
    if (role === "cliente") {
      navigate({
        to: "/clientes/$cidade",
        params: { cidade: encodeURIComponent(form.cidade.trim()) },
        search: { uf: form.estado.trim().toUpperCase() },
      });
      return { loading: false };
    }
    navigate({ to: "/baixar-app" });
    return { loading: false };
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
