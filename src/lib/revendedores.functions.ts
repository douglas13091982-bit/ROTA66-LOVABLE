import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type CriarInput = {
  email: string;
  senha: string;
  nome: string;
  telefone?: string;
  documento?: string;
  mensalidade_valor: number;
  percentual_receita: number;
  dia_vencimento: number;
};

export const criarRevendedor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CriarInput) => data)
  .handler(async ({ data, context }) => {
    const { data: isSuper } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (!isSuper) throw new Error("Acesso negado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. cria auth user (email já confirmado)
    const { data: created, error: errCreate } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.trim().toLowerCase(),
      password: data.senha,
      email_confirm: true,
      user_metadata: { full_name: data.nome },
    });
    if (errCreate || !created?.user) {
      throw new Error(errCreate?.message ?? "Falha ao criar usuário");
    }
    const uid = created.user.id;

    // 2. papel revendedor
    const { error: errRole } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: uid, role: "revendedor" as any });
    if (errRole) throw new Error(errRole.message);

    // 3. perfil revendedor
    const { error: errRev } = await supabaseAdmin.from("revendedores" as any).insert({
      user_id: uid,
      nome: data.nome.trim(),
      email: data.email.trim().toLowerCase(),
      telefone: data.telefone ?? null,
      documento: data.documento ?? null,
      mensalidade_valor: data.mensalidade_valor,
      percentual_receita: data.percentual_receita,
      dia_vencimento: data.dia_vencimento,
    });
    if (errRev) throw new Error(errRev.message);

    return { user_id: uid };
  });

export const excluirRevendedor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { user_id: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: isSuper } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (!isSuper) throw new Error("Acesso negado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
