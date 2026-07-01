import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";

type CriarInput = {
  loja_id: string;
  revendedor_id?: string | null;
  email_destinatario?: string | null;
  dias_validade?: number;
};

async function assertSuperAdmin(context: any) {
  const { data: isSuper } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "super_admin",
  });
  if (!isSuper) throw new Error("Acesso negado");
}

export const criarConviteLoja = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CriarInput) => data)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    if (!data.loja_id) throw new Error("Loja obrigatória");

    const dias = Math.min(60, Math.max(1, data.dias_validade ?? 7));
    const expira = new Date(Date.now() + dias * 24 * 3600 * 1000).toISOString();

    const { data: inserted, error } = await (context.supabase as any)
      .from("revendedor_convites_loja")
      .insert({
        loja_id: data.loja_id,
        revendedor_id: data.revendedor_id ?? null,
        email_destinatario: data.email_destinatario ?? null,
        criado_por: context.userId,
        expira_em: expira,
      })
      .select("id, token, expira_em")
      .single();

    if (error) throw new Error(error.message);
    return inserted as { id: string; token: string; expira_em: string };
  });

export const listarConvitesLoja = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { data, error } = await (context.supabase as any)
      .from("revendedor_convites_loja")
      .select("id, token, loja_id, revendedor_id, email_destinatario, status, expira_em, aceito_em, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as any[];

    const lojaIds = Array.from(new Set(rows.map((r) => r.loja_id).filter(Boolean)));
    const revIds = Array.from(new Set(rows.map((r) => r.revendedor_id).filter(Boolean)));

    const [lojasRes, revRes] = await Promise.all([
      lojaIds.length
        ? (context.supabase as any).from("lojas").select("id, nome").in("id", lojaIds)
        : Promise.resolve({ data: [] as any[] }),
      revIds.length
        ? (context.supabase as any).from("revendedores").select("id, nome, email").in("id", revIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const lojasMap = new Map((lojasRes.data ?? []).map((l: any) => [l.id, l]));
    const revMap = new Map((revRes.data ?? []).map((r: any) => [r.id, r]));

    return rows.map((r) => ({
      ...r,
      lojas: lojasMap.get(r.loja_id) ?? null,
      revendedores: revMap.get(r.revendedor_id) ?? null,
    }));
  });


export const cancelarConviteLoja = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { error } = await (context.supabase as any)
      .from("revendedor_convites_loja")
      .update({ status: "cancelado" })
      .eq("id", data.id)
      .eq("status", "pendente");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const aceitarConviteLoja = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: result, error } = await (context.supabase as any).rpc("aceitar_convite_loja", { _token: data.token });
    if (error) throw new Error(error.message);
    return result as { ok: boolean; loja_id: string; loja_nome: string };
  });

// Público — não exige login. Usa client publishable no server.
export const getConviteLojaPublico = createServerFn({ method: "GET" })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const supa = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: rows, error } = await (supa as any).rpc("convite_loja_publico", { _token: data.token });
    if (error) throw new Error(error.message);
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) throw new Error("Convite não encontrado");
    return row as {
      loja_nome: string;
      status: "pendente" | "aceito" | "expirado" | "cancelado";
      expira_em: string;
      email_destinatario: string | null;
      tem_revendedor_alvo: boolean;
    };
  });

// Lista lojas para o dropdown do super admin
export const listarLojasParaConvite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { data, error } = await (context.supabase as any)
      .from("lojas")
      .select("id, nome, cidade, revendedor_id")
      .order("nome");
    if (error) throw new Error(error.message);
    return (data ?? []) as { id: string; nome: string; cidade: string | null; revendedor_id: string | null }[];
  });

export const listarRevendedoresParaConvite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { data, error } = await (context.supabase as any)
      .from("revendedores")
      .select("user_id, nome, email")
      .eq("ativo", true)
      .order("nome");
    if (error) throw new Error(error.message);
    return (data ?? []) as { user_id: string; nome: string; email: string }[];
  });
