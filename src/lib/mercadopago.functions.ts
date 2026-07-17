import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
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
  if (!host) return "";
  // MP rejeita URLs não públicas (localhost, IPs privados, host com porta)
  if (/^(localhost|127\.|0\.0\.0\.0|192\.168\.|10\.|::1)/i.test(host)) return "";
  if (host.includes(":")) return "";
  return `https://${host}/api/public/mp-webhook`;
}

// Split "João da Silva" em first/last respeitando limites do MP.
function splitNome(nome: string | undefined | null): { first_name: string; last_name: string } {
  const n = String(nome ?? "").trim().replace(/\s+/g, " ");
  if (!n) return { first_name: "Cliente", last_name: "Catalogo" };
  const parts = n.split(" ");
  if (parts.length === 1) return { first_name: parts[0].slice(0, 40), last_name: parts[0].slice(0, 40) };
  return { first_name: parts[0].slice(0, 40), last_name: parts.slice(1).join(" ").slice(0, 40) };
}

// Extrai DDD + número de um telefone brasileiro em formato livre.
function parseTelefoneBr(tel: string | undefined | null): { area_code: string; number: string } | null {
  const d = String(tel ?? "").replace(/\D/g, "");
  if (d.length < 10) return null;
  // remove DDI 55 se presente
  const local = d.length > 11 && d.startsWith("55") ? d.slice(2) : d;
  if (local.length < 10 || local.length > 11) return null;
  return { area_code: local.slice(0, 2), number: local.slice(2) };
}

// Monta additional_info + payer enriquecido a partir do snapshot do pedido pendente.
function buildAdditionalInfo(dados: any, lojaNome: string | null) {
  const itens = Array.isArray(dados?.itens) ? dados.itens : [];
  const items = itens.slice(0, 30).map((it: any, idx: number) => ({
    id: String(it?.produto_id ?? `item-${idx}`).slice(0, 40),
    title: String(it?.nome ?? "Item").slice(0, 80),
    description: String(it?.nome ?? "Item").slice(0, 200),
    category_id: "food",
    quantity: Number(it?.qtd) > 0 ? Math.trunc(Number(it.qtd)) : 1,
    unit_price: Math.round(Number(it?.preco ?? 0) * 100) / 100,
  }));
  const phone = parseTelefoneBr(dados?.cliente_telefone);
  const nome = splitNome(dados?.cliente_nome);
  const endereco = String(dados?.endereco_entrega ?? "").trim();
  const cidade = String(dados?.cidade ?? "").trim();

  const additional_info: any = {};
  if (items.length > 0) additional_info.items = items;
  additional_info.payer = {
    first_name: nome.first_name,
    last_name: nome.last_name,
    ...(phone ? { phone: { area_code: phone.area_code, number: phone.number } } : {}),
  };
  if (endereco) {
    additional_info.shipments = {
      receiver_address: {
        street_name: endereco.slice(0, 250),
        ...(cidade ? { city_name: cidade.slice(0, 60) } : {}),
      },
    };
  }
  const base = (lojaNome ?? "ROTA66").toUpperCase().replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  const statement_descriptor = (base || "ROTA66").slice(0, 22);
  return { additional_info, phone, nome, statement_descriptor };
}

async function loadPendenteContexto(pendente_id: string) {
  const { data, error } = await supabaseAdmin
    .from("pedidos_pendentes_pagamento" as any)
    .select("id, loja_id, dados")
    .eq("id", pendente_id)
    .maybeSingle();
  if (error) return { dados: null, lojaNome: null };
  const loja_id = (data as any)?.loja_id;
  let lojaNome: string | null = null;
  if (loja_id) {
    const { data: loja } = await supabaseAdmin
      .from("lojas")
      .select("nome")
      .eq("id", loja_id)
      .maybeSingle();
    lojaNome = (loja as any)?.nome ?? null;
  }
  return { dados: (data as any)?.dados ?? null, lojaNome };
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
    const amount = Math.round(Number(p.valor_total) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Valor inválido para pagamento");

    const payment = await mpCreatePayment(
      cfg.access_token,
      {
        transaction_amount: amount,
        description: `Pedido catálogo`,
        payment_method_id: "pix",
        payer: {
          email: data.payer_email,
          first_name: data.payer_nome,
          identification: { type: docType, number: docDigits },
        },
        external_reference: `cat_pendente:${p.id}`,
        ...(notification_url ? { notification_url } : {}),
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
    const amount = Math.round(Number(p.valor_total) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Valor inválido para pagamento");

    const payment = await mpCreatePayment(
      cfg.access_token,
      {
        transaction_amount: amount,
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
        ...(notification_url ? { notification_url } : {}),
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
      const { aplicarTaxaMpAoPedido, aplicarTaxaMarketplaceAoPedido } = await import("@/lib/mp-taxa.server");
      await aplicarTaxaMpAoPedido(pedido_id, payment);
      await aplicarTaxaMarketplaceAoPedido(pedido_id, payment);
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
            const { aplicarTaxaMpAoPedido, aplicarTaxaMarketplaceAoPedido } = await import("@/lib/mp-taxa.server");
            await aplicarTaxaMpAoPedido(pedido_id, payment);
            await aplicarTaxaMarketplaceAoPedido(pedido_id, payment);
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
