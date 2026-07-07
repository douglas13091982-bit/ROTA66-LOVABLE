import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

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
  if (!host) throw new Error("Host público não configurado");
  return `https://${normalizeMpHost(host)}/api/public/mp-webhook`;
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
  return host ? `https://${normalizeMpHost(host)}/loja/financeiro` : "";
}

const PagarSchema = z.object({
  cobranca_id: z.string().uuid(),
  metodo: z.enum(["pix", "cartao"]),
  payer_email: z.string().email().max(120),
  payer_nome: z.string().trim().min(2).max(120).optional(),
  payer_doc: z.string().trim().max(18).optional(),
});

export const gerarPagamentoCobranca = createServerFn({ method: "POST" })
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

    const { data: c, error: cerr } = await supabase
      .from("cobrancas_loja")
      .select("id, loja_id, valor, pago, vencimento, periodo_inicio, periodo_fim, qtd_pedidos")
      .eq("id", data.cobranca_id)
      .maybeSingle();
    if (cerr) throw new Error(cerr.message);
    if (!c) throw new Error("Cobrança não encontrada");
    if ((c as any).pago) throw new Error("Cobrança já está paga");

    const { data: loja } = await supabase
      .from("lojas")
      .select("id, owner_id, nome")
      .eq("id", (c as any).loja_id)
      .maybeSingle();
    if (!loja || (loja as any).owner_id !== userId) throw new Error("Sem permissão");

    const valor = Number((c as any).valor);
    if (valor <= 0) throw new Error("Valor zerado — nada a pagar");

    const periodoTxt =
      (c as any).periodo_inicio && (c as any).periodo_fim
        ? ` (${(c as any).periodo_inicio} a ${(c as any).periodo_fim}, ${(c as any).qtd_pedidos ?? 0} pedidos)`
        : "";
    const descricao = `ROTA 66 - Taxas por pedido${periodoTxt} - ${(loja as any).nome}`;
    const notification_url = buildWebhookUrl();

    if (data.metodo === "pix") {
      const expira = new Date(Date.now() + 30 * 60 * 1000);
      const payment = await mpCreatePixPlataforma(
        cfg,
        {
          valor,
          descricao,
          external_reference: `cobranca:${c.id}`,
          payer_email: data.payer_email,
          payer_nome: data.payer_nome ?? "Loja",
          payer_doc: data.payer_doc,
          notification_url,
          expira_em: expira,
        },
        `cob-pix-${c.id}`,
      );
      await supabaseAdmin
        .from("cobrancas_loja" as any)
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
        .eq("id", c.id);
      return {
        metodo: "pix" as const,
        qr_code: payment.point_of_interaction?.transaction_data?.qr_code ?? "",
        qr_code_base64: payment.point_of_interaction?.transaction_data?.qr_code_base64 ?? "",
        ticket_url: payment.point_of_interaction?.transaction_data?.ticket_url ?? "",
        expira_em: expira.toISOString(),
        valor,
      };
    }

    const pref = await mpCreatePreferencePlataforma(cfg, {
      titulo: descricao,
      valor,
      external_reference: `cobranca:${c.id}`,
      payer_email: data.payer_email,
      notification_url,
      back_url: buildBackUrl(),
    });
    await supabaseAdmin
      .from("cobrancas_loja" as any)
      .update({
        metodo_pagamento: "cartao",
        mp_payment_id: pref.id,
        mp_payment_status: "pending",
        pago_solicitado_em: new Date().toISOString(),
      })
      .eq("id", c.id);
    return { metodo: "cartao" as const, init_point: pref.init_point, valor };
  });

const StatusSchema = z.object({ cobranca_id: z.string().uuid() });

export const consultarStatusCobranca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => StatusSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: c } = await supabase
      .from("cobrancas_loja")
      .select("pago, mp_payment_status, pago_em")
      .eq("id", data.cobranca_id)
      .maybeSingle();
    return {
      pago: !!(c as any)?.pago,
      mp_status: (c as any)?.mp_payment_status ?? null,
      pago_em: (c as any)?.pago_em ?? null,
    };
  });

// ============================================================
// Fatura agregadora: paga várias cobrancas_loja num único MP
// ============================================================

const PagarLoteSchema = z.object({
  cobranca_ids: z.array(z.string().uuid()).min(1).max(200),
  metodo: z.enum(["pix", "cartao"]),
  payer_email: z.string().email().max(120),
  payer_nome: z.string().trim().min(2).max(120).optional(),
  payer_doc: z.string().trim().max(18).optional(),
});

export const gerarPagamentoAgregadoCobrancas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PagarLoteSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getPlataformaMp, mpCreatePixPlataforma, mpCreatePreferencePlataforma } = await import(
      "@/lib/plataforma-mp.server"
    );

    const cfg = await getPlataformaMp();
    if (!cfg) throw new Error("Pagamento online ainda não foi configurado pelo administrador");

    const { data: cobs, error } = await supabase
      .from("cobrancas_loja")
      .select("id, loja_id, valor, pago, fatura_mp_id")
      .in("id", data.cobranca_ids);
    if (error) throw new Error(error.message);
    if (!cobs || cobs.length !== data.cobranca_ids.length) {
      throw new Error("Uma ou mais cobranças não foram encontradas");
    }

    const lojaIds = new Set(cobs.map((c: any) => c.loja_id));
    if (lojaIds.size > 1) throw new Error("Cobranças de lojas diferentes não podem ser agrupadas");
    const lojaId = cobs[0]!.loja_id as string;

    const { data: loja } = await supabase
      .from("lojas")
      .select("id, owner_id, nome")
      .eq("id", lojaId)
      .maybeSingle();
    if (!loja || (loja as any).owner_id !== userId) throw new Error("Sem permissão");

    if (cobs.some((c: any) => c.pago)) throw new Error("Uma ou mais cobranças já estão pagas");

    const valor = cobs.reduce((acc: number, c: any) => acc + Number(c.valor), 0);
    if (valor <= 0) throw new Error("Valor zerado — nada a pagar");
    const valor2 = Math.round(valor * 100) / 100;

    // Cria fatura agregadora
    const { data: fatura, error: fErr } = await supabaseAdmin
      .from("cobrancas_faturas_mp" as any)
      .insert({
        loja_id: lojaId,
        valor_total: valor2,
        qtd_cobrancas: cobs.length,
        metodo_pagamento: data.metodo,
      } as any)
      .select("id")
      .single();
    if (fErr || !fatura) throw new Error(fErr?.message ?? "Falha ao criar fatura");
    const faturaId = (fatura as any).id as string;

    // Liga cobranças à fatura e marca como solicitado
    await supabaseAdmin
      .from("cobrancas_loja" as any)
      .update({
        fatura_mp_id: faturaId,
        pago_solicitado_em: new Date().toISOString(),
      } as any)
      .in("id", data.cobranca_ids);

    const descricao = `ROTA 66 - Taxas por pedido (${cobs.length} cobranças) - ${(loja as any).nome}`;
    const notification_url = buildWebhookUrl();
    const externalRef = `fatura:${faturaId}`;

    if (data.metodo === "pix") {
      const expira = new Date(Date.now() + 30 * 60 * 1000);
      const payment = await mpCreatePixPlataforma(
        cfg,
        {
          valor: valor2,
          descricao,
          external_reference: externalRef,
          payer_email: data.payer_email,
          payer_nome: data.payer_nome ?? "Loja",
          payer_doc: data.payer_doc,
          notification_url,
          expira_em: expira,
        },
        `fat-pix-${faturaId}`,
      );
      await supabaseAdmin
        .from("cobrancas_faturas_mp" as any)
        .update({
          mp_payment_id: String(payment.id),
          mp_payment_status: payment.status,
          mp_qr_code: payment.point_of_interaction?.transaction_data?.qr_code ?? null,
          mp_qr_code_base64: payment.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
          mp_ticket_url: payment.point_of_interaction?.transaction_data?.ticket_url ?? null,
          mp_pix_expira_em: expira.toISOString(),
        } as any)
        .eq("id", faturaId);
      return {
        fatura_id: faturaId,
        metodo: "pix" as const,
        qr_code: payment.point_of_interaction?.transaction_data?.qr_code ?? "",
        qr_code_base64: payment.point_of_interaction?.transaction_data?.qr_code_base64 ?? "",
        ticket_url: payment.point_of_interaction?.transaction_data?.ticket_url ?? "",
        expira_em: expira.toISOString(),
        valor: valor2,
      };
    }

    const pref = await mpCreatePreferencePlataforma(cfg, {
      titulo: descricao,
      valor: valor2,
      external_reference: externalRef,
      payer_email: data.payer_email,
      notification_url,
      back_url: buildBackUrl(),
    });
    await supabaseAdmin
      .from("cobrancas_faturas_mp" as any)
      .update({
        mp_payment_id: pref.id,
        mp_payment_status: "pending",
      } as any)
      .eq("id", faturaId);
    return {
      fatura_id: faturaId,
      metodo: "cartao" as const,
      init_point: pref.init_point,
      valor: valor2,
    };
  });

const StatusFaturaSchema = z.object({ fatura_id: z.string().uuid() });

export const consultarStatusFatura = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => StatusFaturaSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: f } = await supabase
      .from("cobrancas_faturas_mp" as any)
      .select("pago, mp_payment_status, pago_em, valor_total, qtd_cobrancas")
      .eq("id", data.fatura_id)
      .maybeSingle();
    return {
      pago: !!(f as any)?.pago,
      mp_status: (f as any)?.mp_payment_status ?? null,
      pago_em: (f as any)?.pago_em ?? null,
      valor_total: Number((f as any)?.valor_total ?? 0),
      qtd_cobrancas: Number((f as any)?.qtd_cobrancas ?? 0),
    };
  });
