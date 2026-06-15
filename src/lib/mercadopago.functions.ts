import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

/**
 * URL pública usada pelo Mercado Pago para enviar webhooks.
 * Prioriza PUBLIC_HOST (override explícito), depois o host real da requisição.
 * Nunca usa http — webhooks do MP exigem HTTPS.
 */
function buildWebhookUrl(lojaId: string): string {
  const envHost = process.env.PUBLIC_HOST?.trim();
  let host = envHost && envHost.length > 0 ? envHost : "";
  if (!host) {
    try {
      host = getRequestHost();
    } catch {
      host = "";
    }
  }
  if (!host) {
    throw new Error("Host público não configurado para o webhook do Mercado Pago");
  }
  return `https://${host}/api/public/mp-webhook/${lojaId}`;
}


// ---------- Config (loja dono) ----------

const TestarConexaoSchema = z.object({
  loja_id: z.string().uuid(),
  access_token: z.string().min(10).max(500),
});

export const testarConexaoMp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TestarConexaoSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: loja } = await supabase.from("lojas").select("id, owner_id").eq("id", data.loja_id).maybeSingle();
    if (!loja || (loja as any).owner_id !== context.userId) throw new Error("Sem permissão");
    const { mpVerifyToken } = await import("@/lib/mercadopago.server");
    const result = await mpVerifyToken(data.access_token);
    return result;
  });

// ---------- Pagamento (público) ----------

const PixSchema = z.object({
  pedido_id: z.string().uuid(),
  payer_email: z.string().email().max(120),
  payer_doc: z.string().trim().min(11).max(18),
  payer_nome: z.string().trim().min(2).max(120),
});

export const criarPagamentoPix = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PixSchema.parse(d))
  .handler(async ({ data }) => {
    const { getMpConfigByLojaId, mpCreatePayment } = await import("@/lib/mercadopago.server");

    const { data: pedido, error: perr } = await supabaseAdmin
      .from("pedidos")
      .select("id, loja_id, valor_total, status, mp_payment_id, numero")
      .eq("id", data.pedido_id)
      .maybeSingle();
    if (perr) throw new Error(perr.message);
    if (!pedido) throw new Error("Pedido não encontrado");
    if (pedido.status !== "aguardando_pagamento") throw new Error("Pedido não está aguardando pagamento");
    if (pedido.mp_payment_id) throw new Error("Pagamento já criado para este pedido");

    const cfg = await getMpConfigByLojaId(pedido.loja_id as string);
    if (!cfg || !cfg.ativo) throw new Error("Esta loja não aceita Pix online");

    const notification_url = buildWebhookUrl(pedido.loja_id as string);

    const expira = new Date(Date.now() + 30 * 60 * 1000);

    const docDigits = data.payer_doc.replace(/\D/g, "");
    const docType = docDigits.length > 11 ? "CNPJ" : "CPF";

    const payment = await mpCreatePayment(
      cfg.access_token,
      {
        transaction_amount: Number(pedido.valor_total),
        description: `Pedido #${pedido.numero}`,
        payment_method_id: "pix",
        payer: {
          email: data.payer_email,
          first_name: data.payer_nome,
          identification: { type: docType, number: docDigits },
        },
        external_reference: pedido.id as string,
        notification_url,
        date_of_expiration: expira.toISOString().replace("Z", "-00:00"),
      },
      `pix-${pedido.id}`,
    );

    await supabaseAdmin
      .from("pedidos")
      .update({
        mp_payment_id: String(payment.id),
        mp_payment_status: payment.status,
        mp_pix_expira_em: expira.toISOString(),
      } as any)
      .eq("id", pedido.id);

    return {
      payment_id: String(payment.id),
      qr_code: payment.point_of_interaction?.transaction_data?.qr_code ?? "",
      qr_code_base64: payment.point_of_interaction?.transaction_data?.qr_code_base64 ?? "",
      ticket_url: payment.point_of_interaction?.transaction_data?.ticket_url ?? "",
      expira_em: expira.toISOString(),
      status: payment.status,
    };
  });

const CartaoSchema = z.object({
  pedido_id: z.string().uuid(),
  card_token: z.string().min(8).max(200),
  installments: z.number().int().min(1).max(12),
  payment_method_id: z.string().min(2).max(50),
  issuer_id: z.string().max(50).optional(),
  payer_email: z.string().email().max(120),
  payer_doc: z.string().trim().min(11).max(18),
});

export const criarPagamentoCartao = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CartaoSchema.parse(d))
  .handler(async ({ data }) => {
    const { getMpConfigByLojaId, mpCreatePayment } = await import("@/lib/mercadopago.server");

    const { data: pedido, error: perr } = await supabaseAdmin
      .from("pedidos")
      .select("id, loja_id, valor_total, status, mp_payment_id, numero")
      .eq("id", data.pedido_id)
      .maybeSingle();
    if (perr) throw new Error(perr.message);
    if (!pedido) throw new Error("Pedido não encontrado");
    if (pedido.status !== "aguardando_pagamento") throw new Error("Pedido não está aguardando pagamento");
    if (pedido.mp_payment_id) throw new Error("Pagamento já processado");

    const cfg = await getMpConfigByLojaId(pedido.loja_id as string);
    if (!cfg || !cfg.ativo) throw new Error("Esta loja não aceita cartão online");

    const notification_url = buildWebhookUrl(pedido.loja_id as string);

    const docDigits = data.payer_doc.replace(/\D/g, "");
    const docType = docDigits.length > 11 ? "CNPJ" : "CPF";

    const payment = await mpCreatePayment(
      cfg.access_token,
      {
        transaction_amount: Number(pedido.valor_total),
        description: `Pedido #${pedido.numero}`,
        token: data.card_token,
        installments: data.installments,
        payment_method_id: data.payment_method_id,
        issuer_id: data.issuer_id,
        payer: {
          email: data.payer_email,
          identification: { type: docType, number: docDigits },
        },
        external_reference: pedido.id as string,
        notification_url,
      },
      `card-${pedido.id}-${Date.now()}`,
    );

    const aprovado = payment.status === "approved";
    await supabaseAdmin
      .from("pedidos")
      .update({
        mp_payment_id: String(payment.id),
        mp_payment_status: payment.status,
        pagamento_aprovado_em: aprovado ? new Date().toISOString() : null,
        status: aprovado ? "em_preparo" : "aguardando_pagamento",
      } as any)
      .eq("id", pedido.id);

    return {
      payment_id: String(payment.id),
      status: payment.status,
      status_detail: payment.status_detail,
      aprovado,
    };
  });

const StatusSchema = z.object({ pedido_id: z.string().uuid() });

export const consultarStatusPagamento = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => StatusSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: p } = await supabaseAdmin
      .from("pedidos")
      .select("status, mp_payment_status, pagamento_aprovado_em")
      .eq("id", data.pedido_id)
      .maybeSingle();
    return {
      status: (p as any)?.status ?? null,
      mp_status: (p as any)?.mp_payment_status ?? null,
      aprovado_em: (p as any)?.pagamento_aprovado_em ?? null,
    };
  });
