import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MP_BASE = "https://api.mercadopago.com";

function normalizeMpHost(host: string): string {
  const h = host.trim().toLowerCase();
  const m1 = h.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.lovableproject\.com$/);
  if (m1) return `project--${m1[1]}-dev.lovable.app`;
  const m2 = h.match(/^id-preview--([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.lovable\.app$/);
  if (m2) return `project--${m2[1]}-dev.lovable.app`;
  return h;
}

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
  if (!host) return "";
  return `https://${normalizeMpHost(host)}/api/public/mp-webhook`;
}

async function getMpToken(): Promise<string> {
  const { getPlataformaMp } = await import("@/lib/plataforma-mp.server");
  const cfg = await getPlataformaMp();
  if (!cfg?.access_token) {
    throw new Error("Mercado Pago da plataforma não está configurado");
  }
  return cfg.access_token;
}

export const criarRecargaPixLoja = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { lojaId: string; valor: number }) => {
    if (!input?.lojaId) throw new Error("lojaId obrigatório");
    const v = Number(input?.valor);
    if (!Number.isFinite(v) || v < 5) throw new Error("Valor mínimo: R$ 5,00");
    if (v > 50000) throw new Error("Valor máximo: R$ 50.000,00");
    return { lojaId: input.lojaId, valor: Math.round(v * 100) / 100 };
  })
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context as any;

    // Confirma que é dono da loja
    const { data: loja } = await supabase
      .from("lojas")
      .select("id, nome, owner_id, cnpj")
      .eq("id", data.lojaId)
      .maybeSingle();
    if (!loja || (loja as any).owner_id !== userId) {
      throw new Error("Sem permissão para recarregar essa loja");
    }

    const accessToken = await getMpToken();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: userRow } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = userRow?.user?.email ?? `loja-${data.lojaId}@example.com`;

    const expira = new Date(Date.now() + 30 * 60 * 1000);

    const { data: rec, error: recErr } = await supabaseAdmin
      .from("lojas_recargas_mp" as any)
      .insert({
        loja_id: data.lojaId,
        valor: data.valor,
        status: "pendente",
      } as any)
      .select("id")
      .single();
    if (recErr || !rec) throw new Error(recErr?.message ?? "Falha ao registrar recarga");
    const recargaId = (rec as any).id as string;

    const notification_url = buildWebhookUrl();
    const body = {
      transaction_amount: data.valor,
      description: `Recarga de saldo - ${(loja as any).nome ?? "loja"}`,
      payment_method_id: "pix",
      payer: {
        email,
        first_name: (loja as any).nome ?? "Loja",
      },
      external_reference: `loja_recarga:${recargaId}`,
      date_of_expiration: expira.toISOString().replace("Z", "-00:00"),
      ...(notification_url ? { notification_url } : {}),
    };

    const res = await fetch(`${MP_BASE}/v1/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `loja-recarga-${recargaId}`,
      },
      body: JSON.stringify(body),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      await supabaseAdmin
        .from("lojas_recargas_mp" as any)
        .update({ status: "erro" } as any)
        .eq("id", recargaId);
      throw new Error(json?.message ?? `Erro Mercado Pago (${res.status})`);
    }

    const td = json?.point_of_interaction?.transaction_data ?? {};
    await supabaseAdmin
      .from("lojas_recargas_mp" as any)
      .update({
        mp_payment_id: String(json.id),
        status: json.status ?? "pendente",
        pix_qrcode: td.qr_code ?? null,
        pix_qrcode_base64: td.qr_code_base64 ?? null,
      } as any)
      .eq("id", recargaId);

    return {
      recargaId,
      mpPaymentId: String(json.id),
      qrCode: td.qr_code ?? null,
      qrCodeBase64: td.qr_code_base64 ?? null,
      expiraEm: expira.toISOString(),
      valor: data.valor,
    };
  });

export const consultarStatusRecargaLoja = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { recargaId: string }) => {
    if (!input?.recargaId) throw new Error("recargaId obrigatório");
    return { recargaId: input.recargaId };
  })
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rec } = await supabaseAdmin
      .from("lojas_recargas_mp" as any)
      .select("id, loja_id, valor, status, mp_payment_id, aprovado_em")
      .eq("id", data.recargaId)
      .maybeSingle();
    if (!rec) throw new Error("Recarga não encontrada");
    const r = rec as any;

    // Valida ownership da loja
    const { data: loja } = await supabaseAdmin
      .from("lojas")
      .select("owner_id")
      .eq("id", r.loja_id)
      .maybeSingle();
    if (!loja || (loja as any).owner_id !== userId) {
      throw new Error("Sem permissão");
    }

    if (r.aprovado_em) return { status: "approved" as const, creditado: true };
    if (!r.mp_payment_id) return { status: r.status as string, creditado: false };

    try {
      const accessToken = await getMpToken();
      const res = await fetch(`${MP_BASE}/v1/payments/${r.mp_payment_id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) return { status: r.status as string, creditado: false };

      const status = json.status as string;
      await supabaseAdmin
        .from("lojas_recargas_mp" as any)
        .update({ status } as any)
        .eq("id", r.id);

      if (status === "approved" && !r.aprovado_em) {
        // Claim atômico: marca aprovado_em antes de creditar saldo
        const { data: claim } = await supabaseAdmin
          .from("lojas_recargas_mp" as any)
          .update({ aprovado_em: new Date().toISOString() } as any)
          .eq("id", r.id)
          .is("aprovado_em", null)
          .select("id")
          .maybeSingle();
        if (claim) {
          await supabaseAdmin.rpc("aplicar_movimento_loja_saldo" as any, {
            _loja_id: r.loja_id,
            _delta: Number(r.valor),
            _tipo: "recarga",
            _pedido_id: null,
            _descricao: `Recarga PIX MP #${r.mp_payment_id}`,
          });
        }
        return { status: "approved" as const, creditado: true };
      }
      return { status, creditado: false };
    } catch {
      return { status: r.status as string, creditado: false };
    }
  });
