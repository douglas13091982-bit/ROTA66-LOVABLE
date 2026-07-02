import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureOwner(context: any) {
  const { data: isOwner } = await context.supabase.rpc("is_franquia_owner", { _uid: context.userId });
  if (!isOwner) throw new Error("Acesso restrito ao owner da franquia");
}

type CriarInput = {
  email: string;
  senha: string;
  nome: string;
  telefone?: string;
  documento?: string;
  cidade: string;
  mensalidade_valor: number;
  dia_vencimento: number;
};

export const criarFranqueado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CriarInput) => data)
  .handler(async ({ data, context }) => {
    await ensureOwner(context);
    if (!data.cidade?.trim()) throw new Error("Cidade obrigatória");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: errCreate } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.trim().toLowerCase(),
      password: data.senha,
      email_confirm: true,
      user_metadata: { full_name: data.nome },
    });
    if (errCreate || !created?.user) throw new Error(errCreate?.message ?? "Falha ao criar usuário");
    const uid = created.user.id;

    const { error: errRole } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: uid, role: "super_admin" as any });
    if (errRole) throw new Error(errRole.message);

    const { error: errCfg } = await supabaseAdmin.from("franqueados_config" as any).insert({
      user_id: uid,
      cidade: data.cidade.trim(),
      mensalidade_valor: data.mensalidade_valor,
      dia_vencimento: Math.min(28, Math.max(1, data.dia_vencimento || 5)),
    });
    if (errCfg) throw new Error(errCfg.message);

    await supabaseAdmin.from("profiles").upsert({
      id: uid,
      full_name: data.nome.trim(),
      phone: data.telefone ?? null,
      cpf: data.documento ?? null,
    } as any, { onConflict: "id" });

    return { user_id: uid };
  });

export const excluirFranqueado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const gerarFaturasFranquiaAgora = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureOwner(context);
    const { data, error } = await context.supabase.rpc("gerar_faturas_franquia" as any);
    if (error) throw new Error(error.message);
    return { criadas: data };
  });
