// Server-only helpers para Mercado Pago.
// NUNCA importar deste arquivo a partir de código client-side.

const MP_BASE = "https://api.mercadopago.com";

export interface MpLojaConfig {
  loja_id: string;
  access_token: string;
  public_key: string;
  webhook_secret: string;
  ativo: boolean;
}

export async function getMpConfigByLojaId(lojaId: string): Promise<MpLojaConfig | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("lojas_pagamento_mp" as any)
    .select("loja_id, access_token, public_key, webhook_secret, ativo")
    .eq("loja_id", lojaId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as any) ?? null;
}

interface MpPaymentBody {
  transaction_amount: number;
  description: string;
  payment_method_id?: string;
  token?: string;
  installments?: number;
  issuer_id?: string;
  payer: {
    email: string;
    first_name?: string;
    identification?: { type: string; number: string };
  };
  external_reference?: string;
  notification_url?: string;
  date_of_expiration?: string;
}

interface MpPaymentResponse {
  id: number;
  status: string;
  status_detail: string;
  external_reference?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
  date_of_expiration?: string;
}


export async function mpCreatePayment(
  accessToken: string,
  body: MpPaymentBody,
  idempotencyKey: string,
): Promise<MpPaymentResponse> {
  const res = await fetch(`${MP_BASE}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    const msg = json?.message ?? json?.error ?? `Erro Mercado Pago (${res.status})`;
    const cause = Array.isArray(json?.cause) && json.cause[0]?.description ? `: ${json.cause[0].description}` : "";
    throw new Error(`${msg}${cause}`);
  }
  return json as MpPaymentResponse;
}

export async function mpGetPayment(accessToken: string, paymentId: string): Promise<MpPaymentResponse> {
  const res = await fetch(`${MP_BASE}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    throw new Error(json?.message ?? `Erro ao consultar pagamento (${res.status})`);
  }
  return json as MpPaymentResponse;
}

export async function mpVerifyToken(accessToken: string): Promise<{ ok: boolean; nickname?: string; error?: string }> {
  try {
    const res = await fetch(`${MP_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) return { ok: false, error: json?.message ?? `HTTP ${res.status}` };
    return { ok: true, nickname: json?.nickname };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Falha de rede" };
  }
}
