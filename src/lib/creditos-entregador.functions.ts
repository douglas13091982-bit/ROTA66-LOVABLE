import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MP_BASE = "https://api.mercadopago.com";

async function getMpToken(): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("config_creditos_entregador" as any)
    .select("mp_access_token, ativo")
    .eq("singleton", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as any;
  if (!row?.mp_access_token) {
    throw new Error("Mercado Pago do sistema não está configurado");
  }
  return row.mp_access_token as string;
}

export const criarRecargaPix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(() => ({}))
  .handler(async ({ context }) => {
    const { userId, supabase } = context as any;

    // Confirma que é entregador aprovado
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "entregador")
      .maybeSingle();
    if (!roleRow) throw new Error("Apenas entregadores podem recarregar");

    // Valor SEMPRE vem da config do admin (mensalidade fixa)
    const { supabaseAdmin: _sa } = await import("@/integrations/supabase/client.server");
    const { data: cfg } = await _sa
      .from("config_creditos_entregador" as any)
      .select("mensalidade_valor, ativo")
      .eq("singleton", true)
      .maybeSingle();
    const cfgRow = cfg as any;
    if (!cfgRow?.ativo) throw new Error("Mensalidade desativada");
    const valor = Number(cfgRow?.mensalidade_valor ?? 0);
    if (!Number.isFinite(valor) || valor < 1) throw new Error("Valor de mensalidade inválido");
    const data = { valor: Math.round(valor * 100) / 100 };

    const accessToken = await getMpToken();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();

    const { data: userRow } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = userRow?.user?.email ?? `entregador-${userId}@example.com`;

    const expira = new Date(Date.now() + 30 * 60 * 1000);

    const { data: rec, error: recErr } = await supabaseAdmin
      .from("entregador_recargas_mp" as any)
      .insert({
        entregador_id: userId,
        valor: data.valor,
        status: "pending",
        expira_em: expira.toISOString(),
      } as any)
      .select("id")
      .single();
    if (recErr || !rec) throw new Error(recErr?.message ?? "Falha ao registrar recarga");

    const recargaId = (rec as any).id as string;

    const body = {
      transaction_amount: data.valor,
      description: `Recarga de créditos - entregador`,
      payment_method_id: "pix",
      payer: {
        email,
        first_name: (prof as any)?.full_name ?? "Entregador",
      },
      external_reference: `recarga:${recargaId}`,
      date_of_expiration: expira.toISOString().replace("Z", "-00:00"),
    };

    const res = await fetch(`${MP_BASE}/v1/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `recarga-${recargaId}`,
      },
      body: JSON.stringify(body),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      await supabaseAdmin
        .from("entregador_recargas_mp" as any)
        .update({ status: "error" } as any)
        .eq("id", recargaId);
      throw new Error(json?.message ?? `Erro Mercado Pago (${res.status})`);
    }

    const td = json?.point_of_interaction?.transaction_data ?? {};
    await supabaseAdmin
      .from("entregador_recargas_mp" as any)
      .update({
        mp_payment_id: String(json.id),
        status: json.status ?? "pending",
        qr_code: td.qr_code ?? null,
        qr_code_base64: td.qr_code_base64 ?? null,
        ticket_url: td.ticket_url ?? null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", recargaId);

    return {
      recargaId,
      mpPaymentId: String(json.id),
      qrCode: td.qr_code ?? null,
      qrCodeBase64: td.qr_code_base64 ?? null,
      ticketUrl: td.ticket_url ?? null,
      expiraEm: expira.toISOString(),
      valor: data.valor,
    };
  });

export const consultarStatusRecarga = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { recargaId: string }) => {
    if (!input?.recargaId) throw new Error("recargaId obrigatório");
    return { recargaId: input.recargaId };
  })
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rec } = await supabaseAdmin
      .from("entregador_recargas_mp" as any)
      .select("id, entregador_id, valor, status, mp_payment_id, creditado")
      .eq("id", data.recargaId)
      .maybeSingle();

    if (!rec || (rec as any).entregador_id !== userId) {
      throw new Error("Recarga não encontrada");
    }
    const r = rec as any;

    // Já creditado: retorna direto
    if (r.creditado) {
      return { status: "approved" as const, creditado: true };
    }

    if (!r.mp_payment_id) {
      return { status: r.status as string, creditado: false };
    }

    // Consulta MP
    try {
      const accessToken = await getMpToken();
      const res = await fetch(`${MP_BASE}/v1/payments/${r.mp_payment_id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) return { status: r.status as string, creditado: false };

      const status = json.status as string;
      await supabaseAdmin
        .from("entregador_recargas_mp" as any)
        .update({ status, updated_at: new Date().toISOString() } as any)
        .eq("id", r.id);

      if (status === "approved" && !r.creditado) {
        // Credita atomicamente: marca creditado=true antes
        const { data: claim } = await supabaseAdmin
          .from("entregador_recargas_mp" as any)
          .update({ creditado: true } as any)
          .eq("id", r.id)
          .eq("creditado", false)
          .select("id")
          .maybeSingle();
        if (claim) {
          await supabaseAdmin.rpc("aplicar_credito_entregador" as any, {
            _entregador_id: r.entregador_id,
            _delta: Number(r.valor),
            _tipo: "recarga",
            _descricao: `Recarga PIX MP #${r.mp_payment_id}`,
            _mp_payment_id: String(r.mp_payment_id),
            _competencia: null,
            _created_by: null,
          });
        }
        return { status: "approved" as const, creditado: true };
      }

      return { status, creditado: false };
    } catch (e: any) {
      return { status: r.status as string, creditado: false };
    }
  });
