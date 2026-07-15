import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureFranqueadoDono(context: any): Promise<string> {
  // Só o franqueado dono (com franqueados_config) pode gerenciar colaboradores
  const { data: cfg } = await context.supabase
    .from("franqueados_config")
    .select("user_id")
    .eq("user_id", context.userId)
    .maybeSingle();
  if (!cfg) throw new Error("Apenas franqueados podem gerenciar colaboradores");
  return context.userId as string;
}

export type Colaborador = {
  id: string;
  colaborador_user_id: string;
  ativo: boolean;
  created_at: string;
  email: string | null;
  nome: string | null;
};

export const listarColaboradores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Colaborador[]> => {
    const franqueadoId = await ensureFranqueadoDono(context);
    const { data: rows, error } = await context.supabase
      .from("franqueado_colaboradores")
      .select("id, colaborador_user_id, ativo, created_at")
      .eq("franqueado_user_id", franqueadoId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result: Colaborador[] = [];
    for (const r of rows ?? []) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(r.colaborador_user_id);
      result.push({
        id: r.id,
        colaborador_user_id: r.colaborador_user_id,
        ativo: r.ativo,
        created_at: r.created_at,
        email: u?.user?.email ?? null,
        nome: (u?.user?.user_metadata?.full_name as string) ?? null,
      });
    }
    return result;
  });

export const adicionarColaborador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; senha?: string }) => d)
  .handler(async ({ data, context }) => {
    const franqueadoId = await ensureFranqueadoDono(context);
    const email = data.email.trim().toLowerCase();
    if (!email) throw new Error("Informe um e-mail");
    const senha = (data.senha ?? "").trim();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Busca usuário pelo e-mail (percorre páginas)
    let found: { id: string } | null = null;
    for (let page = 1; page <= 10 && !found; page++) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      const users = list?.users ?? [];
      const hit = users.find((u: any) => (u.email ?? "").toLowerCase() === email);
      if (hit) found = { id: hit.id };
      if (users.length < 200) break;
    }

    // Se não existir, cria a conta com a senha informada
    if (!found) {
      if (senha.length < 6) {
        throw new Error("Este e-mail ainda não tem conta. Informe uma senha (mín. 6 caracteres) para criar.");
      }
      const { data: created, error: errCreate } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
      });
      if (errCreate || !created?.user) throw new Error(errCreate?.message ?? "Falha ao criar usuário");
      found = { id: created.user.id };
    }

    if (found.id === franqueadoId) throw new Error("Você não pode se adicionar como colaborador");

    // Não permitir adicionar quem já é franqueado
    const { data: jaFranq } = await supabaseAdmin
      .from("franqueados_config" as any)
      .select("user_id")
      .eq("user_id", found.id)
      .maybeSingle();
    if (jaFranq) throw new Error("Este usuário já é um franqueado");

    // Não permitir se já está vinculado a outro franqueado
    const { data: jaColab } = await supabaseAdmin
      .from("franqueado_colaboradores" as any)
      .select("franqueado_user_id, ativo")
      .eq("colaborador_user_id", found.id)
      .maybeSingle();
    const jc: any = jaColab; if (jc?.ativo && jc.franqueado_user_id !== franqueadoId) {
      throw new Error("Este usuário já é colaborador de outro franqueado");
    }

    const { error: errIns } = await supabaseAdmin
      .from("franqueado_colaboradores" as any)
      .upsert(
        {
          franqueado_user_id: franqueadoId,
          colaborador_user_id: found.id,
          ativo: true,
        },
        { onConflict: "colaborador_user_id" },
      );
    if (errIns) throw new Error(errIns.message);

    return { user_id: found.id };
  });

export const removerColaborador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const franqueadoId = await ensureFranqueadoDono(context);
    const { error } = await context.supabase
      .from("franqueado_colaboradores")
      .delete()
      .eq("id", data.id)
      .eq("franqueado_user_id", franqueadoId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
