// Server-only: integração Mercado Pago da PLATAFORMA (recebe mensalidades das lojas).
// O access token fica em public.private_config (chave 'mp_platform_access_token').

const MP_BASE = "https://api.mercadopago.com";

export interface PlataformaMpCfg {
  access_token: string;
  webhook_secret: string;
}

async function getPrivateConfig(key: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("private_config" as any)
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return (data as any)?.value ?? null;
}

async function setPrivateConfig(key: string, value: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("private_config" as any)
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

export async function getPlataformaMp(): Promise<PlataformaMpCfg | null> {
  const token = await getPrivateConfig("mp_platform_access_token");
  if (!token) return null;
  const secret = (await getPrivateConfig("mp_platform_webhook_secret")) ?? "";
  return { access_token: token, webhook_secret: secret };
}

export async function setPlataformaMpToken(token: string): Promise<void> {
  await setPrivateConfig("mp_platform_access_token", token.trim());
}

export async function getPlataformaMpPublicKey(): Promise<string | null> {
  return await getPrivateConfig("mp_platform_public_key");
}

export async function setPlataformaMpPublicKey(key: string): Promise<void> {
  const trimmed = (key ?? "").trim();
  if (!trimmed) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("private_config" as any).delete().eq("key", "mp_platform_public_key");
    return;
  }
  await setPrivateConfig("mp_platform_public_key", trimmed);
}

/**
 * Salva a "Assinatura secreta" copiada do painel do Mercado Pago.
 * Não geramos chave do nosso lado — o MP é quem gera e exibe a chave
 * no painel de Webhooks. Aqui apenas armazenamos uma cópia para que o
 * dispatcher consiga validar o HMAC dos eventos recebidos.
 * Passar string vazia remove a chave armazenada.
 */
export async function setPlataformaMpWebhookSecret(value: string): Promise<void> {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("private_config" as any)
      .delete()
      .eq("key", "mp_platform_webhook_secret");
    return;
  }
  await setPrivateConfig("mp_platform_webhook_secret", trimmed);
}

export async function clearPlataformaMpToken(): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("private_config" as any).delete().eq("key", "mp_platform_access_token");
}

export interface MpPayment {
  id: number;
  status: string;
  status_detail: string;
  external_reference?: string;
  payment_type_id?: string; // "credit_card" | "debit_card" | "account_money" | "bank_transfer" | ...
  payment_method_id?: string; // "pix" | "master" | "visa" | "debvisa" | ...
  transaction_amount?: number;
  fee_details?: Array<{ type?: string; amount?: number; fee_payer?: string }>;
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string } };
}

export async function mpCreatePixPlataforma(
  cfg: PlataformaMpCfg,
  body: {
    valor: number;
    descricao: string;
    external_reference: string;
    payer_email: string;
    payer_nome: string;
    payer_doc?: string;
    notification_url: string;
    expira_em: Date;
  },
  idempotencyKey: string,
): Promise<MpPayment> {
  const docDigits = (body.payer_doc ?? "").replace(/\D/g, "");
  const docType = docDigits.length > 11 ? "CNPJ" : "CPF";
  const res = await fetch(`${MP_BASE}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.access_token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      transaction_amount: Number(body.valor),
      description: body.descricao,
      payment_method_id: "pix",
      external_reference: body.external_reference,
      notification_url: body.notification_url,
      date_of_expiration: body.expira_em.toISOString().replace("Z", "-00:00"),
      payer: {
        email: body.payer_email,
        first_name: body.payer_nome,
        ...(docDigits ? { identification: { type: docType, number: docDigits } } : {}),
      },
    }),
  });
  const json = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    const msg = json?.message ?? json?.error ?? `Erro Mercado Pago (${res.status})`;
    throw new Error(msg);
  }
  return json as MpPayment;
}

export async function mpCreatePreferencePlataforma(
  cfg: PlataformaMpCfg,
  body: {
    titulo: string;
    valor: number;
    external_reference: string;
    payer_email: string;
    notification_url: string;
    back_url: string;
  },
): Promise<{ id: string; init_point: string }> {
  const res = await fetch(`${MP_BASE}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [
        {
          title: body.titulo,
          quantity: 1,
          unit_price: Number(body.valor),
          currency_id: "BRL",
        },
      ],
      payer: { email: body.payer_email },
      external_reference: body.external_reference,
      notification_url: body.notification_url,
      back_urls: { success: body.back_url, failure: body.back_url, pending: body.back_url },
      auto_return: "approved",
      payment_methods: {
        excluded_payment_types: [{ id: "ticket" }], // exclui boleto, foca em cartão
        installments: 12,
      },
    }),
  });
  const json = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    throw new Error(json?.message ?? `Erro Mercado Pago (${res.status})`);
  }
  return { id: String(json.id), init_point: String(json.init_point ?? json.sandbox_init_point ?? "") };
}

export async function mpGetPaymentPlataforma(cfg: PlataformaMpCfg, paymentId: string): Promise<MpPayment> {
  const res = await fetch(`${MP_BASE}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${cfg.access_token}` },
  });
  const json = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) throw new Error(json?.message ?? `Erro ao consultar pagamento (${res.status})`);
  return json as MpPayment;
}

export async function mpVerifyTokenPlataforma(token: string): Promise<{ ok: boolean; nickname?: string; error?: string }> {
  try {
    const res = await fetch(`${MP_BASE}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
    const json = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) return { ok: false, error: json?.message ?? `HTTP ${res.status}` };
    return { ok: true, nickname: json?.nickname };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Falha de rede" };
  }
}
