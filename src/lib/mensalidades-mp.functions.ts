import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

function buildWebhookUrl(): string {
  const envHost = process.env.PUBLIC_HOST?.trim();
  let host = envHost && envHost.length > 0 ? envHost : "";
  if (!host) {
    try {
      host = getRequestHost();
    } catch {
      host = "";
    }
  }
  if (!host) throw new Error("Host público não configurado");
  // Endpoint único da plataforma — cobre mensalidades de loja e recargas de entregador.
  return `https://${host}/api/public/mp-webhook`;
}

function buildBackUrl(): string {
  const envHost = process.env.PUBLIC_HOST?.trim();
  let host = envHost && envHost.length > 0 ? envHost : "";
  if (!host) {
    try {
      host = getRequestHost();
    } catch {
      host = "";
    }
  }
  return host ? `https://${host}/loja/financeiro` : "";
}

// ============================================================
// SUPER ADMIN: configurar access token da plataforma
// ============================================================

async function assertSuperAdmin(supabase: any, userId: string): Promise<void> {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" });
  if (!data) throw new Error("Acesso restrito ao super admin");
}

export const obterStatusTokenPlataforma = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { getPlataformaMp, getPlataformaMpPublicKey, mpVerifyTokenPlataforma } = await import(
      "@/lib/plataforma-mp.server"
    );
    let webhook_url = "";
    try {
      webhook_url = buildWebhookUrl();
    } catch {
      webhook_url = "";
    }
    const cfg = await getPlataformaMp();
    const public_key = await getPlataformaMpPublicKey();
    if (!cfg) {
      return { configurado: false as const, webhook_url, public_key };
    }
    const verif = await mpVerifyTokenPlataforma(cfg.access_token);
    return {
      configurado: true as const,
      valido: verif.ok,
      nickname: verif.nickname,
      erro: verif.error,
      webhook_url,
      webhook_secret: cfg.webhook_secret,
      public_key,
    };
  });

const SalvarTokenSchema = z.object({ access_token: z.string().min(10).max(500) });

export const salvarTokenPlataforma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SalvarTokenSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { setPlataformaMpToken, mpVerifyTokenPlataforma } = await import("@/lib/plataforma-mp.server");
    const verif = await mpVerifyTokenPlataforma(data.access_token);
    if (!verif.ok) throw new Error(`Token inválido: ${verif.error ?? "desconhecido"}`);
    await setPlataformaMpToken(data.access_token);
    return { ok: true, nickname: verif.nickname };
  });

const SalvarPublicKeySchema = z.object({ public_key: z.string().trim().max(500) });

export const salvarPublicKeyPlataforma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SalvarPublicKeySchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { setPlataformaMpPublicKey } = await import("@/lib/plataforma-mp.server");
    await setPlataformaMpPublicKey(data.public_key);
    return { ok: true };
  });

const SalvarWebhookSecretSchema = z.object({ webhook_secret: z.string().trim().max(500) });

export const salvarWebhookSecretPlataforma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SalvarWebhookSecretSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { setPlataformaMpWebhookSecret } = await import("@/lib/plataforma-mp.server");
    await setPlataformaMpWebhookSecret(data.webhook_secret);
    return { ok: true };
  });

export const removerTokenPlataforma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { clearPlataformaMpToken } = await import("@/lib/plataforma-mp.server");
    await clearPlataformaMpToken();
    return { ok: true };
  });

// ============================================================
// SUPER ADMIN: taxas cobradas pelo Mercado Pago (percentuais)
// ============================================================

export const obterTaxasMp = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { getMpTaxas, MP_TAXAS_PADRAO } = await import("@/lib/plataforma-mp.server");
    const atual = await getMpTaxas();
    return { atual, padrao: MP_TAXAS_PADRAO };
  });

const SalvarTaxasSchema = z.object({
  pix: z.number().min(0).max(100),
  debit_card: z.number().min(0).max(100),
  credit_card: z.number().min(0).max(100),
});

export const salvarTaxasMp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SalvarTaxasSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { setMpTaxas } = await import("@/lib/plataforma-mp.server");
    await setMpTaxas(data);
    return { ok: true };
  });

// ============================================================
// LOJA: consolidar e pagar mensalidade
// ============================================================

const ConsolidarSchema = z.object({
  loja_id: z.string().uuid(),
  competencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const consolidarMensalidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ConsolidarSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: loja } = await supabase
      .from("lojas")
      .select("id, owner_id")
      .eq("id", data.loja_id)
      .maybeSingle();
    if (!loja || (loja as any).owner_id !== userId) throw new Error("Sem permissão");
    const comp = data.competencia ?? new Date().toISOString().slice(0, 8) + "01";
    const { data: id, error } = await (supabase as any).rpc("consolidar_mensalidade_loja", {
      _loja_id: data.loja_id,
      _competencia: comp,
    });
    if (error) throw new Error(error.message);
    return { mensalidade_id: id as string };
  });

const PagarSchema = z.object({
  mensalidade_id: z.string().uuid(),
  metodo: z.enum(["pix", "cartao"]),
  payer_email: z.string().email().max(120),
  payer_nome: z.string().trim().min(2).max(120).optional(),
  payer_doc: z.string().trim().max(18).optional(),
});

export const gerarPagamentoMensalidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PagarSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getPlataformaMp, mpCreatePixPlataforma, mpCreatePreferencePlataforma } = await import(
      "@/lib/plataforma-mp.server"
    );

    const cfg = await getPlataformaMp();
    if (!cfg) throw new Error("Pagamento online ainda não foi configurado pelo administrador");

    // valida acesso da loja
    const { data: m, error: merr } = await supabase
      .from("mensalidades_loja")
      .select("id, loja_id, valor, valor_tarifas_pedidos, pago, mp_payment_id, mp_pix_expira_em, competencia")
      .eq("id", data.mensalidade_id)
      .maybeSingle();
    if (merr) throw new Error(merr.message);
    if (!m) throw new Error("Mensalidade não encontrada");
    if ((m as any).pago) throw new Error("Mensalidade já está paga");

    const { data: loja } = await supabase
      .from("lojas")
      .select("id, owner_id, nome")
      .eq("id", (m as any).loja_id)
      .maybeSingle();
    if (!loja || (loja as any).owner_id !== userId) throw new Error("Sem permissão");

    const valorTotal = Number((m as any).valor) + Number((m as any).valor_tarifas_pedidos ?? 0);
    if (valorTotal <= 0) throw new Error("Valor zerado — nada a pagar");

    const descricao = `ROTA 66 - Mensalidade ${(m as any).competencia} - ${(loja as any).nome}`;
    const notification_url = buildWebhookUrl();

    if (data.metodo === "pix") {
      const expira = new Date(Date.now() + 30 * 60 * 1000);
      const payment = await mpCreatePixPlataforma(
        cfg,
        {
          valor: valorTotal,
          descricao,
          external_reference: `mensalidade:${m.id}`,
          payer_email: data.payer_email,
          payer_nome: data.payer_nome ?? "Loja",
          payer_doc: data.payer_doc,
          notification_url,
          expira_em: expira,
        },
        `mens-pix-${m.id}`,
      );
      await supabaseAdmin
        .from("mensalidades_loja" as any)
        .update({
          metodo_pagamento: "pix",
          mp_payment_id: String(payment.id),
          mp_payment_status: payment.status,
          mp_qr_code: payment.point_of_interaction?.transaction_data?.qr_code ?? null,
          mp_qr_code_base64: payment.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
          mp_ticket_url: payment.point_of_interaction?.transaction_data?.ticket_url ?? null,
          mp_pix_expira_em: expira.toISOString(),
          pago_solicitado_em: new Date().toISOString(),
        })
        .eq("id", m.id);
      return {
        metodo: "pix" as const,
        qr_code: payment.point_of_interaction?.transaction_data?.qr_code ?? "",
        qr_code_base64: payment.point_of_interaction?.transaction_data?.qr_code_base64 ?? "",
        ticket_url: payment.point_of_interaction?.transaction_data?.ticket_url ?? "",
        expira_em: expira.toISOString(),
        valor: valorTotal,
      };
    }

    // cartão via Checkout Pro
    const pref = await mpCreatePreferencePlataforma(cfg, {
      titulo: descricao,
      valor: valorTotal,
      external_reference: `mensalidade:${m.id}`,
      payer_email: data.payer_email,
      notification_url,
      back_url: buildBackUrl(),
    });
    await supabaseAdmin
      .from("mensalidades_loja" as any)
      .update({
        metodo_pagamento: "cartao",
        mp_payment_id: pref.id,
        mp_payment_status: "pending",
        pago_solicitado_em: new Date().toISOString(),
      })
      .eq("id", m.id);
    return { metodo: "cartao" as const, init_point: pref.init_point, valor: valorTotal };
  });

const StatusSchema = z.object({ mensalidade_id: z.string().uuid() });

export const consultarStatusMensalidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => StatusSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: m } = await supabase
      .from("mensalidades_loja")
      .select("pago, mp_payment_status, pago_em")
      .eq("id", data.mensalidade_id)
      .maybeSingle();
    return {
      pago: !!(m as any)?.pago,
      mp_status: (m as any)?.mp_payment_status ?? null,
      pago_em: (m as any)?.pago_em ?? null,
    };
  });
