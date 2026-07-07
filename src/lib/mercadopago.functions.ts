import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestHost } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const PREVIEW_PUBLIC_HOST = "id-preview--94fe485e-cde1-4611-9db7-d8635e0448a7.lovable.app";

function hostFromCandidate(value?: string | null): string {
  const raw = value?.trim();
  if (!raw) return "";
  const first = raw.split(",")[0]?.trim() ?? "";
  try {
    const url = /^[a-z][a-z\d+\-.]*:\/\//i.test(first) ? first : `https://${first}`;
    return new URL(url).host;
  } catch {
    return first.replace(/^https?:\/\//i, "").split("/")[0] ?? "";
  }
}

function isLocalHost(host: string): boolean {
  const h = hostFromCandidate(host).split(":")[0]?.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0" || h === "::1";
}

function normalizeMpHost(host: string): string {
  const h = hostFromCandidate(host).toLowerCase();
  if (!h || isLocalHost(h)) return PREVIEW_PUBLIC_HOST;
  const m1 = h.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.lovableproject\.com$/);
  if (m1) return `id-preview--${m1[1]}.lovable.app`;
  const m2 = h.match(/^id-preview--([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.lovable\.app$/);
  if (m2) return `id-preview--${m2[1]}.lovable.app`;
  const m3 = h.match(/^project--([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-dev\.lovable\.app$/);
  if (m3) return `id-preview--${m3[1]}.lovable.app`;
  return h;
}

function safeHeader(name: string): string {
  try {
    return getRequestHeader(name as any) ?? "";
  } catch {
    return "";
  }
}

function getPublicHost(): string {
  const envHost = normalizeMpHost(process.env.PUBLIC_HOST ?? "");
  if (envHost && !isLocalHost(envHost)) return envHost;

  const candidates = [
    safeHeader("origin"),
    safeHeader("referer"),
    safeHeader("x-forwarded-host"),
    safeHeader("host"),
  ];

  try {
    candidates.push(getRequestHost({ xForwardedHost: true }));
  } catch {
    // ignore
  }
  try {
    candidates.push(getRequestHost());
  } catch {
    // ignore
  }

  for (const candidate of candidates) {
    const normalized = normalizeMpHost(candidate);
    if (normalized && !isLocalHost(normalized)) return normalized;
  }

  return PREVIEW_PUBLIC_HOST;
}

function buildWebhookUrl(): string {
  const host = getPublicHost();
  if (!host) throw new Error("Host público não configurado para o webhook do Mercado Pago");
  return `https://${host}/api/public/mp-webhook`;
}

// ---------- Config (compat, mantida) ----------
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
    return await mpVerifyToken(data.access_token);
  });

// ---------- Pagamento de catálogo (usa conta MP da PLATAFORMA) ----------

async function getPlataformaCfgOrThrow() {
  const { getPlataformaMp } = await import("@/lib/plataforma-mp.server");
  const cfg = await getPlataformaMp();
  if (!cfg || !cfg.access_token) {
    throw new Error("Pagamento online indisponível: plataforma sem Mercado Pago configurado");
  }
  return cfg;
}

const PixSchema = z.object({
  pendente_id: z.string().uuid(),
  payer_email: z.string().email().max(120),
  payer_doc: z.string().trim().min(11).max(18),
  payer_nome: z.string().trim().min(2).max(120),
});

export const criarPagamentoPix = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PixSchema.parse(d))
  .handler(async ({ data }) => {
    const { mpCreatePayment } = await import("@/lib/mercadopago.server");

    const { data: pend, error: perr } = await supabaseAdmin
      .from("pedidos_pendentes_pagamento" as any)
      .select("id, loja_id, valor_total, status, mp_payment_id, mp_pix_qr_code, mp_pix_qr_base64, mp_pix_expira_em")
      .eq("id", data.pendente_id)
      .maybeSingle();
    if (perr) throw new Error(perr.message);
    if (!pend) throw new Error("Pedido pendente não encontrado");
    const p = pend as any;
    if (p.status !== "aguardando") throw new Error("Pedido não está mais aguardando pagamento");

    if (p.mp_payment_id && p.mp_pix_qr_code) {
      return {
        payment_id: String(p.mp_payment_id),
        qr_code: p.mp_pix_qr_code,
        qr_code_base64: p.mp_pix_qr_base64 ?? "",
        ticket_url: "",
        expira_em: p.mp_pix_expira_em ?? null,
        status: "pending",
      };
    }

    const cfg = await getPlataformaCfgOrThrow();
    const notification_url = buildWebhookUrl();
    const expira = new Date(Date.now() + 30 * 60 * 1000);

    const docDigits = data.payer_doc.replace(/\D/g, "");
    const docType = docDigits.length > 11 ? "CNPJ" : "CPF";

    const payment = await mpCreatePayment(
      cfg.access_token,
      {
        transaction_amount: Number(p.valor_total),
        description: `Pedido catálogo`,
        payment_method_id: "pix",
        payer: {
          email: data.payer_email,
          first_name: data.payer_nome,
          identification: { type: docType, number: docDigits },
        },
        external_reference: `cat_pendente:${p.id}`,
        notification_url,
        date_of_expiration: expira.toISOString().replace("Z", "-00:00"),
      },
      `catpix-${p.id}`,
    );

    const qrCode = payment.point_of_interaction?.transaction_data?.qr_code ?? "";
    const qrBase64 = payment.point_of_interaction?.transaction_data?.qr_code_base64 ?? "";

    await supabaseAdmin
      .from("pedidos_pendentes_pagamento" as any)
      .update({
        mp_payment_id: String(payment.id),
        mp_payment_status: payment.status,
        mp_pix_qr_code: qrCode,
        mp_pix_qr_base64: qrBase64,
        mp_pix_expira_em: expira.toISOString(),
      } as any)
      .eq("id", p.id);

    return {
      payment_id: String(payment.id),
      qr_code: qrCode,
      qr_code_base64: qrBase64,
      ticket_url: payment.point_of_interaction?.transaction_data?.ticket_url ?? "",
      expira_em: expira.toISOString(),
      status: payment.status,
    };
  });

const CartaoSchema = z.object({
  pendente_id: z.string().uuid(),
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
    const { mpCreatePayment } = await import("@/lib/mercadopago.server");

    const { data: pend, error: perr } = await supabaseAdmin
      .from("pedidos_pendentes_pagamento" as any)
      .select("id, loja_id, valor_total, status, mp_payment_id, pedido_id")
      .eq("id", data.pendente_id)
      .maybeSingle();
    if (perr) throw new Error(perr.message);
    if (!pend) throw new Error("Pedido pendente não encontrado");
    const p = pend as any;
    if (p.status !== "aguardando") throw new Error("Pedido não está mais aguardando pagamento");
    if (p.mp_payment_id) throw new Error("Pagamento já processado");

    const cfg = await getPlataformaCfgOrThrow();
    const notification_url = buildWebhookUrl();
    const docDigits = data.payer_doc.replace(/\D/g, "");
    const docType = docDigits.length > 11 ? "CNPJ" : "CPF";

    const payment = await mpCreatePayment(
      cfg.access_token,
      {
        transaction_amount: Number(p.valor_total),
        description: `Pedido catálogo`,
        token: data.card_token,
        installments: data.installments,
        payment_method_id: data.payment_method_id,
        issuer_id: data.issuer_id,
        payer: {
          email: data.payer_email,
          identification: { type: docType, number: docDigits },
        },
        external_reference: `cat_pendente:${p.id}`,
        notification_url,
      },
      `catcard-${p.id}-${Date.now()}`,
    );

    const aprovado = payment.status === "approved";

    await supabaseAdmin
      .from("pedidos_pendentes_pagamento" as any)
      .update({
        mp_payment_id: String(payment.id),
        mp_payment_status: payment.status,
      } as any)
      .eq("id", p.id);

    let pedido_id: string | null = null;
    let numero: number | null = null;

    if (aprovado) {
      const { data: novoId, error: matErr } = await supabaseAdmin.rpc(
        "materializar_pedido_pendente" as any,
        {
          _pendente_id: p.id,
          _mp_payment_id: String(payment.id),
          _mp_status: payment.status,
        } as any,
      );
      if (matErr) throw new Error(matErr.message);
      pedido_id = (novoId as unknown as string) ?? null;
      if (pedido_id) {
        const { data: novo } = await supabaseAdmin
          .from("pedidos")
          .select("numero")
          .eq("id", pedido_id)
          .maybeSingle();
        numero = (novo as any)?.numero ?? null;
      }
    } else {
      const cancelado = ["cancelled", "rejected", "refunded", "charged_back"].includes(payment.status);
      if (cancelado) {
        await supabaseAdmin
          .from("pedidos_pendentes_pagamento" as any)
          .update({ status: "cancelado" } as any)
          .eq("id", p.id);
      }
    }

    return {
      payment_id: String(payment.id),
      status: payment.status,
      status_detail: payment.status_detail,
      aprovado,
      pedido_id,
      numero,
    };
  });

const StatusSchema = z.object({ pendente_id: z.string().uuid() });

export const consultarStatusPagamento = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => StatusSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: pend } = await supabaseAdmin
      .from("pedidos_pendentes_pagamento" as any)
      .select("id, status, mp_payment_id, mp_payment_status, pedido_id, loja_id")
      .eq("id", data.pendente_id)
      .maybeSingle();
    if (!pend) return { aprovado: false, status: null, mp_status: null, pedido_id: null, numero: null };
    const p = pend as any;

    if (p.pedido_id) {
      const { data: ped } = await supabaseAdmin
        .from("pedidos")
        .select("numero")
        .eq("id", p.pedido_id)
        .maybeSingle();
      return {
        aprovado: true,
        status: p.status,
        mp_status: p.mp_payment_status,
        pedido_id: p.pedido_id as string,
        numero: (ped as any)?.numero ?? null,
      };
    }

    if (p.mp_payment_id) {
      try {
        const { getPlataformaMp, mpGetPaymentPlataforma } = await import("@/lib/plataforma-mp.server");
        const cfg = await getPlataformaMp();
        if (cfg) {
          const payment = await mpGetPaymentPlataforma(cfg, String(p.mp_payment_id));
          if (payment.status === "approved") {
            const { data: novoId } = await supabaseAdmin.rpc(
              "materializar_pedido_pendente" as any,
              {
                _pendente_id: p.id,
                _mp_payment_id: String(payment.id),
                _mp_status: payment.status,
              } as any,
            );
            const pedido_id = (novoId as unknown as string) ?? null;
            let numero: number | null = null;
            if (pedido_id) {
              const { data: ped } = await supabaseAdmin
                .from("pedidos")
                .select("numero")
                .eq("id", pedido_id)
                .maybeSingle();
              numero = (ped as any)?.numero ?? null;
            }
            return { aprovado: true, status: "aprovado", mp_status: payment.status, pedido_id, numero };
          }
          if (["cancelled", "rejected", "refunded", "charged_back"].includes(payment.status)) {
            await supabaseAdmin
              .from("pedidos_pendentes_pagamento" as any)
              .update({ status: "cancelado", mp_payment_status: payment.status } as any)
              .eq("id", p.id);
            return { aprovado: false, status: "cancelado", mp_status: payment.status, pedido_id: null, numero: null };
          }
          return { aprovado: false, status: p.status, mp_status: payment.status, pedido_id: null, numero: null };
        }
      } catch {
        /* silencioso */
      }
    }

    return {
      aprovado: false,
      status: p.status,
      mp_status: p.mp_payment_status,
      pedido_id: null,
      numero: null,
    };
  });
