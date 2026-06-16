// Server-only: dispatcher único para webhooks do Mercado Pago da plataforma.
// A MESMA conta MP recebe:
//   - mensalidades das lojas        (external_reference = "mensalidade:<id>")
//   - recargas/mensalidades dos entregadores (external_reference = "recarga:<id>")
// Validamos a assinatura HMAC com o webhook_secret guardado em private_config
// e então despachamos pelo prefixo do external_reference.

import { createHmac, timingSafeEqual } from "crypto";

interface ValidateResult {
  ok: boolean;
  status?: number;
  body?: string;
  dataId?: string;
  tipo?: string | null;
}

function verifySignature(
  request: Request,
  payload: any,
  webhookSecret: string,
  strict: boolean,
): ValidateResult {
  const url = new URL(request.url);
  const dataId: string | undefined =
    url.searchParams.get("data.id") ?? payload?.data?.id ?? undefined;
  const tipo: string | null =
    payload?.type ?? payload?.action ?? url.searchParams.get("type") ?? null;

  const sigHeader = request.headers.get("x-signature");
  const reqId = request.headers.get("x-request-id");

  if (!sigHeader || !reqId || !dataId) {
    if (strict) return { ok: false, status: 401, body: "missing signature" };
    return { ok: true, dataId, tipo };
  }

  const parts = Object.fromEntries(
    sigHeader.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k?.trim() ?? "", (v ?? "").trim()];
    }),
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return { ok: false, status: 401, body: "invalid signature" };

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() - tsNum) > 5 * 60 * 1000) {
    return { ok: false, status: 401, body: "stale signature" };
  }

  const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
  const expected = createHmac("sha256", webhookSecret).update(manifest).digest("hex");

  try {
    const a = Buffer.from(v1, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, status: 401, body: "invalid signature" };
    }
  } catch {
    return { ok: false, status: 401, body: "invalid signature" };
  }
  return { ok: true, dataId, tipo };
}

async function processMensalidadeLoja(
  paymentId: string,
  payment: { status: string; external_reference?: string },
): Promise<Response> {
  const ref = String(payment.external_reference ?? "");
  const mensalidadeId = ref.slice("mensalidade:".length);
  if (!mensalidadeId) return new Response("invalid ref", { status: 200 });

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const aprovado = payment.status === "approved";
  const update: Record<string, unknown> = { mp_payment_status: payment.status };
  if (aprovado) {
    update.pago = true;
    update.pago_em = new Date().toISOString();
  }
  await supabaseAdmin
    .from("mensalidades_loja" as any)
    .update(update)
    .eq("id", mensalidadeId);
  return new Response(`ok mensalidade ${paymentId}`, { status: 200 });
}

async function processRecargaEntregador(
  paymentId: string,
  payment: { status: string; external_reference?: string },
): Promise<Response> {
  const ref = String(payment.external_reference ?? "");
  const recargaId = ref.slice("recarga:".length);
  if (!recargaId) return new Response("invalid ref", { status: 200 });

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rec } = await supabaseAdmin
    .from("entregador_recargas_mp" as any)
    .select("id, entregador_id, valor, creditado")
    .eq("id", recargaId)
    .maybeSingle();
  if (!rec) return new Response("recarga not found", { status: 200 });

  const r = rec as any;
  await supabaseAdmin
    .from("entregador_recargas_mp" as any)
    .update({
      status: payment.status,
      mp_payment_id: paymentId,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", recargaId);

  if (payment.status === "approved" && !r.creditado) {
    // Claim atômico: evita dupla creditação
    const { data: claim } = await supabaseAdmin
      .from("entregador_recargas_mp" as any)
      .update({ creditado: true } as any)
      .eq("id", recargaId)
      .eq("creditado", false)
      .select("id")
      .maybeSingle();
    if (claim) {
      await supabaseAdmin.rpc("aplicar_credito_entregador" as any, {
        _entregador_id: r.entregador_id,
        _delta: Number(r.valor),
        _tipo: "recarga",
        _descricao: `Recarga PIX MP #${paymentId}`,
        _mp_payment_id: paymentId,
        _competencia: null,
        _created_by: null,
      });
    }
  }
  return new Response(`ok recarga ${paymentId}`, { status: 200 });
}

/**
 * Dispatcher único. Verifica assinatura com a chave da plataforma e despacha.
 * @param strict Se true, recusa requisições sem cabeçalhos de assinatura.
 *   Os endpoints novos devem usar strict=true. Os endpoints antigos podem
 *   usar strict=false para preservar a tolerância anterior.
 */
export async function handleMpPlataformaWebhook(
  request: Request,
  opts: { strict?: boolean } = {},
): Promise<Response> {
  const strict = opts.strict ?? true;
  const raw = await request.text();
  let payload: any = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const { getPlataformaMp, mpGetPaymentPlataforma } = await import("@/lib/plataforma-mp.server");
  const cfg = await getPlataformaMp();
  if (!cfg) return new Response("plataforma sem mp", { status: 503 });

  const v = verifySignature(request, payload, cfg.webhook_secret, strict);
  if (!v.ok) return new Response(v.body ?? "unauthorized", { status: v.status ?? 401 });

  const paymentId = String(v.dataId ?? "").trim();
  if (!paymentId) return new Response("no payment id", { status: 200 });

  if (v.tipo && !String(v.tipo).includes("payment")) {
    return new Response("ignored", { status: 200 });
  }

  try {
    const payment = await mpGetPaymentPlataforma(cfg, paymentId);
    const ref = String(payment.external_reference ?? "");

    if (ref.startsWith("mensalidade:")) {
      return await processMensalidadeLoja(paymentId, payment);
    }
    if (ref.startsWith("recarga:")) {
      return await processRecargaEntregador(paymentId, payment);
    }
    return new Response("unknown reference", { status: 200 });
  } catch (e: any) {
    console.error("[mp-webhook-dispatcher]", e?.message ?? e);
    return new Response("erro", { status: 500 });
  }
}
