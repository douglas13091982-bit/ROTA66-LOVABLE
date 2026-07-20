import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MIN_INTERVALO_HORAS = 6;

/**
 * Envia uma promoção via push para todos os clientes da cidade da loja.
 * Autorização: dono da loja, funcionário ativo ou super_admin.
 * Rate limit: 1 promoção por loja a cada 6 horas.
 */
export const enviarPromocaoLoja = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        loja_id: z.string().uuid(),
        title: z.string().trim().min(3).max(80),
        body: z.string().trim().min(3).max(300),
        url: z.string().trim().max(400).optional().nullable(),
        image_url: z.string().trim().max(600).optional().nullable(),
        produto_id: z.string().uuid().optional().nullable(),
        preco_promocional: z.number().positive().max(999999).optional().nullable(),
        valido_ate: z.string().datetime().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Carrega loja + valida permissão
    const { data: loja, error: errLoja } = await supabaseAdmin
      .from("lojas")
      .select("id, nome, owner_id, city_id, slug, catalogo_slug")
      .eq("id", data.loja_id)
      .maybeSingle();
    if (errLoja || !loja) throw new Error("Loja não encontrada");

    let autorizado = (loja as any).owner_id === userId;
    if (!autorizado) {
      const { data: isSuper } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "super_admin",
      });
      autorizado = !!isSuper;
    }
    if (!autorizado) {
      const { data: func } = await supabaseAdmin
        .from("loja_funcionarios" as any)
        .select("id")
        .eq("loja_id", data.loja_id)
        .eq("user_id", userId)
        .maybeSingle();
      autorizado = !!func;
    }
    if (!autorizado) throw new Error("Sem permissão para enviar promoções desta loja");

    if (!(loja as any).city_id) {
      throw new Error("Loja sem cidade configurada. Defina a cidade antes de enviar promoções.");
    }

    // 2. Rate limit — 6h
    const desde = new Date(Date.now() - MIN_INTERVALO_HORAS * 3600 * 1000).toISOString();
    const { data: recentes } = await supabaseAdmin
      .from("promocoes_lojas" as any)
      .select("id, created_at")
      .eq("loja_id", data.loja_id)
      .gte("created_at", desde)
      .in("status", ["pending", "enviada"])
      .order("created_at", { ascending: false })
      .limit(1);
    if (recentes && recentes.length > 0) {
      const last = new Date((recentes[0] as any).created_at).getTime();
      const restante = Math.ceil(
        (MIN_INTERVALO_HORAS * 3600 * 1000 - (Date.now() - last)) / (3600 * 1000),
      );
      throw new Error(
        `Você só pode enviar 1 promoção a cada ${MIN_INTERVALO_HORAS}h. Tente novamente em ~${Math.max(1, restante)}h.`,
      );
    }

    // 3. Carrega cidade
    const { data: cidade } = await supabaseAdmin
      .from("cidades")
      .select("id, nome, uf")
      .eq("id", (loja as any).city_id)
      .maybeSingle();

    // 4a. Se veio produto + preco_promocional, aplica o preço promocional no produto
    if (data.produto_id && data.preco_promocional != null && data.preco_promocional > 0) {
      const { data: prod } = await supabaseAdmin
        .from("produtos")
        .select("id, loja_id, preco")
        .eq("id", data.produto_id)
        .maybeSingle();
      if (!prod || (prod as any).loja_id !== data.loja_id) {
        throw new Error("Produto não pertence a esta loja");
      }
      if (Number(data.preco_promocional) >= Number((prod as any).preco)) {
        throw new Error("Preço promocional deve ser menor que o preço atual do produto");
      }
      const { error: errUp } = await supabaseAdmin
        .from("produtos")
        .update({
          preco_promocional: data.preco_promocional,
          preco_promocional_ate: data.valido_ate ?? null,
        })
        .eq("id", data.produto_id);
      if (errUp) throw new Error(errUp.message);
    }

    // 4b. Cria registro pendente
    const linkFinal =
      (data.url && data.url.trim().length > 0
        ? data.url.trim()
        : `/loja/${(loja as any).catalogo_slug || (loja as any).slug}`);

    const { data: promoRow, error: errIns } = await supabaseAdmin
      .from("promocoes_lojas" as any)
      .insert({
        loja_id: data.loja_id,
        city_id: (loja as any).city_id,
        cidade_nome: (cidade as any)?.nome || null,
        title: data.title.trim(),
        body: data.body.trim(),
        url: linkFinal,
        image_url: data.image_url?.trim() || null,
        produto_id: data.produto_id || null,
        preco_promocional: data.preco_promocional ?? null,
        created_by: userId,
        status: "pending",
      })
      .select("id")
      .single();
    if (errIns || !promoRow) throw new Error(errIns?.message || "Falha ao registrar promoção");

    const promoId = (promoRow as any).id as string;

    // 5. Descobre clientes da cidade com push ativo
    const { data: clientesRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "cliente");
    const clienteIds = Array.from(
      new Set((clientesRoles ?? []).map((r: any) => r.user_id).filter(Boolean)),
    );

    let alvos: string[] = [];
    if (clienteIds.length > 0) {
      const { data: perfis } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .in("id", clienteIds)
        .eq("city_id", (loja as any).city_id);
      const perfilIds = (perfis ?? []).map((p: any) => p.id);
      if (perfilIds.length > 0) {
        const { data: subs } = await supabaseAdmin
          .from("push_subscriptions")
          .select("user_id")
          .in("user_id", perfilIds);
        alvos = Array.from(new Set((subs ?? []).map((s: any) => s.user_id)));
      }
    }

    if (alvos.length === 0) {
      await supabaseAdmin
        .from("promocoes_lojas" as any)
        .update({
          status: "enviada",
          destinatarios: 0,
          sent: 0,
          enviada_at: new Date().toISOString(),
        })
        .eq("id", promoId);
      return { promo_id: promoId, destinatarios: 0, sent: 0 };
    }

    // 6. Dispara pushes
    const { data: cfgRow } = await supabaseAdmin
      .from("private_config" as any)
      .select("value")
      .eq("key", "push_trigger_secret")
      .maybeSingle();
    const secret = (cfgRow as any)?.value as string | undefined;
    if (!secret) throw new Error("push_trigger_secret não configurado");

    const host = process.env.PUBLIC_HOST?.trim() || getRequestHost();
    const url = `https://${host}/api/public/send-push`;
    const tag = `promo-${promoId}`;

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
                title: data.title.trim(),
                body: data.body.trim(),
                url: linkFinal,
                image: data.image_url?.trim() || undefined,
                tag,
              }),
            });
            if (!res.ok) return 0;
            const j = (await res.json()) as { sent?: number };
            return j.sent ?? 0;
          } catch {
            return 0;
          }
        }),
      );
      sent += results.reduce((a, b) => a + b, 0);
    }

    await supabaseAdmin
      .from("promocoes_lojas" as any)
      .update({
        status: "enviada",
        destinatarios: alvos.length,
        sent,
        enviada_at: new Date().toISOString(),
      })
      .eq("id", promoId);

    return { promo_id: promoId, destinatarios: alvos.length, sent };
  });
