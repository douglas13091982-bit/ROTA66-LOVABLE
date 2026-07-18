import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(300),
  url: z.string().trim().max(500).optional().nullable(),
  filtro: z.enum(["todos", "cidade", "online", "selecionados"]),
  city_id: z.string().uuid().nullable().optional(),
  user_ids: z.array(z.string().uuid()).max(500).optional(),
});

async function isDonoOuFranqueado(supabase: any, userId: string) {
  const { data: isSuper } = await supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" });
  return !!isSuper;
}

/**
 * Retorna o user_id do franqueado "efetivo":
 *  - se o próprio usuário for franqueado, retorna ele mesmo
 *  - se for colaborador ativo, retorna o franqueado ao qual está vinculado
 *  - caso contrário retorna null
 */
async function getFranqueadoEfetivoId(supabaseAdmin: any, userId: string): Promise<string | null> {
  const { data: cfgSelf } = await supabaseAdmin
    .from("franqueados_config")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (cfgSelf?.user_id) return cfgSelf.user_id as string;

  const { data: colab } = await supabaseAdmin
    .from("franqueado_colaboradores")
    .select("franqueado_user_id")
    .eq("colaborador_user_id", userId)
    .eq("ativo", true)
    .maybeSingle();
  return (colab?.franqueado_user_id as string) ?? null;
}

async function podeUsarPainelPush(supabase: any, supabaseAdmin: any, userId: string) {
  if (await isDonoOuFranqueado(supabase, userId)) return true;
  const fid = await getFranqueadoEfetivoId(supabaseAdmin, userId);
  return !!fid;
}

/**
 * Lista entregadores para o painel de push (respeita cidade do franqueado).
 */
export const listarEntregadoresParaPush = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const isSuper = await isDonoOuFranqueado(supabase, userId);
    const franqueadoEfetivoId = isSuper ? userId : await getFranqueadoEfetivoId(supabaseAdmin, userId);
    if (!isSuper && !franqueadoEfetivoId) {
      throw new Error("Sem permissão");
    }

    // Descobrir cidade do franqueado efetivo (se houver)
    const { data: cfg } = await supabaseAdmin
      .from("franqueados_config" as any)
      .select("city_id")
      .eq("user_id", franqueadoEfetivoId ?? userId)
      .maybeSingle();
    const cityId = (cfg as any)?.city_id as string | null | undefined;

    // Entregadores = profiles com role 'entregador'
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "entregador");
    const entregadorIds = (roles ?? []).map((r: any) => r.user_id);
    if (entregadorIds.length === 0) return { entregadores: [], onlineIds: [] as string[], cityId: cityId ?? null };

    let query = supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone, city_id")
      .in("id", entregadorIds)
      .order("full_name", { ascending: true });
    if (cityId) query = query.eq("city_id", cityId);

    const { data: profiles } = await query;

    // Quem está online agora
    const ids = (profiles ?? []).map((p: any) => p.id);
    let onlineIds: string[] = [];
    if (ids.length) {
      const { data: st } = await supabaseAdmin
        .from("entregador_status")
        .select("entregador_id, online")
        .in("entregador_id", ids)
        .eq("online", true);
      onlineIds = (st ?? []).map((s: any) => s.entregador_id);
    }

    return {
      entregadores: (profiles ?? []).map((p: any) => ({
        id: p.id,
        nome: p.full_name || "(sem nome)",
        phone: p.phone || "",
      })),
      onlineIds,
      cityId: cityId ?? null,
    };
  });

/**
 * Envia push personalizado para entregadores selecionados/filtrados.
 * Franqueado só pode disparar para entregadores da própria cidade.
 */
export const enviarPushEntregadores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const isSuper = await isDonoOuFranqueado(supabase, userId);
    const franqueadoEfetivoId = isSuper ? userId : await getFranqueadoEfetivoId(supabaseAdmin, userId);
    if (!isSuper && !franqueadoEfetivoId) {
      throw new Error("Sem permissão");
    }

    // Cidade do franqueado efetivo (se houver)
    const { data: cfg } = await supabaseAdmin
      .from("franqueados_config" as any)
      .select("city_id")
      .eq("user_id", franqueadoEfetivoId ?? userId)
      .maybeSingle();
    const cityIdFranqueado = (cfg as any)?.city_id as string | null | undefined;

    // Pool de entregadores
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "entregador");
    const entregadorIds = (roles ?? []).map((r: any) => r.user_id);
    if (entregadorIds.length === 0) return { sent: 0, destinatarios: 0 };

    let alvos: string[] = [];

    if (data.filtro === "selecionados") {
      alvos = (data.user_ids ?? []).filter((id) => entregadorIds.includes(id));
    } else {
      let q = supabaseAdmin.from("profiles").select("id, city_id").in("id", entregadorIds);
      if (cityIdFranqueado) q = q.eq("city_id", cityIdFranqueado);
      else if (data.filtro === "cidade" && data.city_id) q = q.eq("city_id", data.city_id);
      const { data: profs } = await q;
      alvos = (profs ?? []).map((p: any) => p.id);

      if (data.filtro === "online") {
        const { data: st } = await supabaseAdmin
          .from("entregador_status")
          .select("entregador_id")
          .in("entregador_id", alvos)
          .eq("online", true);
        alvos = (st ?? []).map((s: any) => s.entregador_id);
      }
    }

    // Franqueado: revalidar que todos os alvos são da sua cidade
    if (cityIdFranqueado && alvos.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .in("id", alvos)
        .eq("city_id", cityIdFranqueado);
      alvos = (profs ?? []).map((p: any) => p.id);
    }

    if (alvos.length === 0) return { sent: 0, destinatarios: 0 };

    // Secret compartilhado com /api/public/send-push
    const { data: cfgRow } = await supabaseAdmin
      .from("private_config" as any)
      .select("value")
      .eq("key", "push_trigger_secret")
      .maybeSingle();
    const secret = (cfgRow as any)?.value as string | undefined;
    if (!secret) throw new Error("push_trigger_secret não configurado");

    const host = process.env.PUBLIC_HOST?.trim() || getRequestHost();
    const url = `https://${host}/api/public/send-push`;

    // Nome dos alvos para log
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("id", alvos);
    const nomes = new Map<string, string>((profs ?? []).map((p: any) => [p.id, p.full_name || ""]));

    const tag = `admin-push-${Date.now()}`;
    const linkFinal = data.url || "/entregador/disponiveis";

    // Cria registros de log ANTES do disparo (status pending). O endpoint
    // send-push atualiza cada linha depois do envio.
    const logRows = alvos.map((uid) => ({
      sender_user_id: userId,
      franqueado_efetivo_id: franqueadoEfetivoId,
      user_id: uid,
      entregador_nome: nomes.get(uid) || null,
      title: data.title,
      body: data.body,
      url: linkFinal,
      tag,
      status: "pending",
    }));
    if (logRows.length) {
      const { error: logErr } = await supabaseAdmin
        .from("push_admin_logs" as any)
        .insert(logRows);
      if (logErr) console.error("[push-admin] insert log falhou", logErr);
    }

    console.log(
      "[push-admin] disparo",
      JSON.stringify({
        sender: userId,
        tag,
        title: data.title,
        body: data.body,
        url: linkFinal,
        destinatarios: alvos.length,
      })
    );

    let sent = 0;

    const CONC = 10;
    for (let i = 0; i < alvos.length; i += CONC) {
      const batch = alvos.slice(i, i + CONC);
      const results = await Promise.all(
        batch.map(async (uid) => {
          try {
            const res = await fetch(url, {
              method: "POST",
              headers: { "content-type": "application/json", "x-push-secret": secret },
              body: JSON.stringify({
                user_id: uid,
                title: data.title,
                body: data.body,
                url: linkFinal,
                tag,
              }),
            });
            if (!res.ok) return 0;
            const j = (await res.json()) as { sent?: number };
            return j.sent ?? 0;
          } catch {
            return 0;
          }
        })
      );
      sent += results.reduce((a, b) => a + b, 0);
    }

    return { sent, destinatarios: alvos.length, tag };
  });

/**
 * Lista o histórico de notificações push enviadas pelo painel.
 * - super_admin: vê tudo
 * - franqueado / colaborador: vê apenas envios do próprio franqueado efetivo
 */
export const listarPushLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const isSuper = await isDonoOuFranqueado(supabase, userId);
    const franqueadoEfetivoId = isSuper ? null : await getFranqueadoEfetivoId(supabaseAdmin, userId);
    if (!isSuper && !franqueadoEfetivoId) throw new Error("Sem permissão");

    let q = supabaseAdmin
      .from("push_admin_logs" as any)
      .select("id, created_at, user_id, entregador_nome, title, body, url, tag, status, http_status, sent, error")
      .order("created_at", { ascending: false })
      .limit(200);

    if (!isSuper && franqueadoEfetivoId) {
      q = q.eq("franqueado_efetivo_id", franqueadoEfetivoId);
    }

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { logs: (data ?? []) as any[] };
  });

