import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getLojaDoOwner(context: any): Promise<{ id: string; plano_id: string | null } | null> {
  const { data } = await context.supabase
    .from("lojas")
    .select("id, plano_id")
    .eq("owner_id", context.userId)
    .maybeSingle();
  return (data as any) ?? null;
}

export const listarFuncionarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const loja = await getLojaDoOwner(context);
    if (!loja) return { funcionarios: [], max: 0, usados: 0 };

    const [{ data: funcs }, { data: plano }] = await Promise.all([
      context.supabase
        .from("loja_funcionarios")
        .select("id, user_id, nome, email, created_at")
        .eq("loja_id", loja.id)
        .order("created_at", { ascending: false }),
      loja.plano_id
        ? context.supabase
            .from("planos_loja" as any)
            .select("max_funcionarios")
            .eq("id", loja.plano_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const max = Number((plano as any)?.data?.max_funcionarios ?? (plano as any)?.max_funcionarios ?? 0);
    return {
      funcionarios: (funcs ?? []) as any[],
      max,
      usados: (funcs ?? []).length,
    };
  });

type CriarInput = { nome: string; email: string; senha: string };

export const criarFuncionario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CriarInput) => d)
  .handler(async ({ data, context }) => {
    const nome = data.nome.trim();
    const email = data.email.trim().toLowerCase();
    if (!nome) throw new Error("Nome obrigatório");
    if (!email || !email.includes("@")) throw new Error("E-mail inválido");
    if (!data.senha || data.senha.length < 6) throw new Error("Senha precisa ter ao menos 6 caracteres");

    const loja = await getLojaDoOwner(context);
    if (!loja) throw new Error("Você não é dono de uma loja");

    // Verifica limite do plano
    const { data: plano } = loja.plano_id
      ? await context.supabase
          .from("planos_loja" as any)
          .select("max_funcionarios, nome")
          .eq("id", loja.plano_id)
          .maybeSingle()
      : { data: null as any };
    const max = Number((plano as any)?.max_funcionarios ?? 0);
    const { count } = await context.supabase
      .from("loja_funcionarios")
      .select("id", { count: "exact", head: true })
      .eq("loja_id", loja.id);
    if (max <= 0) throw new Error("Seu plano não permite cadastrar funcionários. Faça upgrade.");
    if ((count ?? 0) >= max) throw new Error(`Limite do plano atingido (${max} funcionários).`);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: errCreate } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { full_name: nome, is_loja_funcionario: true },
    });
    if (errCreate || !created?.user) {
      const msg = errCreate?.message ?? "Falha ao criar usuário";
      if (msg.toLowerCase().includes("already")) throw new Error("Já existe um usuário com este e-mail.");
      throw new Error(msg);
    }
    const uid = created.user.id;

    const { error: errIns } = await supabaseAdmin.from("loja_funcionarios" as any).insert({
      loja_id: loja.id,
      user_id: uid,
      nome,
      email,
      criado_por: context.userId,
    });
    if (errIns) {
      // rollback do usuário criado
      await supabaseAdmin.auth.admin.deleteUser(uid);
      throw new Error(errIns.message);
    }

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: uid, full_name: nome, email } as any, { onConflict: "id" });

    return { user_id: uid };
  });

export const removerFuncionario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string }) => d)
  .handler(async ({ data, context }) => {
    const loja = await getLojaDoOwner(context);
    if (!loja) throw new Error("Acesso negado");
    const { data: f } = await context.supabase
      .from("loja_funcionarios")
      .select("id")
      .eq("loja_id", loja.id)
      .eq("user_id", data.user_id)
      .maybeSingle();
    if (!f) throw new Error("Funcionário não encontrado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("loja_funcionarios" as any).delete().eq("user_id", data.user_id);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const redefinirSenhaFuncionario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; senha: string }) => d)
  .handler(async ({ data, context }) => {
    if (!data.senha || data.senha.length < 6) throw new Error("Senha precisa ter ao menos 6 caracteres");
    const loja = await getLojaDoOwner(context);
    if (!loja) throw new Error("Acesso negado");
    const { data: f } = await context.supabase
      .from("loja_funcionarios")
      .select("id")
      .eq("loja_id", loja.id)
      .eq("user_id", data.user_id)
      .maybeSingle();
    if (!f) throw new Error("Funcionário não encontrado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.senha,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
