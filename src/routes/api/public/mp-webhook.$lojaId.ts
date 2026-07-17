import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/mp-webhook/$lojaId")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const lojaId = params.lojaId;
        if (!/^[0-9a-f-]{36}$/i.test(lojaId)) {
          return new Response("invalid loja", { status: 400 });
        }

        const body = await request.text();
        let payload: any;
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("invalid json", { status: 400 });
        }

        const { getMpConfigByLojaId, mpGetPayment } = await import("@/lib/mercadopago.server");
        const cfg = await getMpConfigByLojaId(lojaId);
        if (!cfg) return new Response("loja sem mp", { status: 404 });

        // Validação obrigatória da assinatura do MP. Sem webhook_secret configurado, recusa.
        const sigHeader = request.headers.get("x-signature");
        const reqId = request.headers.get("x-request-id");
        const url = new URL(request.url);
        const dataId = url.searchParams.get("data.id") ?? payload?.data?.id;
        if (!cfg.webhook_secret) {
          return new Response("webhook secret not configured", { status: 401 });
        }
        if (!sigHeader || !reqId || !dataId) {
          return new Response("missing signature", { status: 401 });
        }
        const parts = Object.fromEntries(
          sigHeader.split(",").map((p) => {
            const [k, v] = p.split("=");
            return [k.trim(), (v ?? "").trim()];
          }),
        );
        const ts = parts["ts"];
        const v1 = parts["v1"];
        if (!ts || !v1) {
          return new Response("invalid signature", { status: 401 });
        }
        const tsNum = Number(ts);
        if (!Number.isFinite(tsNum) || Math.abs(Date.now() - tsNum) > 5 * 60 * 1000) {
          return new Response("stale signature", { status: 401 });
        }
        const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
        const expected = createHmac("sha256", cfg.webhook_secret).update(manifest).digest("hex");
        let ok = false;
        try {
          const a = Buffer.from(v1, "hex");
          const b = Buffer.from(expected, "hex");
          ok = a.length === b.length && timingSafeEqual(a, b);
        } catch {
          ok = false;
        }
        if (!ok) {
          return new Response("invalid signature", { status: 401 });
        }


        const paymentId: string | undefined = String(dataId ?? payload?.data?.id ?? "").trim() || undefined;
        if (!paymentId) return new Response("no payment id", { status: 200 });

        const tipo = payload?.type ?? payload?.action ?? url.searchParams.get("type");
        if (tipo && !String(tipo).includes("payment")) {
          return new Response("ignored", { status: 200 });
        }

        try {
          const payment = await mpGetPayment(cfg.access_token, paymentId);
          const ref = String(payment.external_reference ?? "");
          if (!ref) return new Response("no external_reference", { status: 200 });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const aprovado = payment.status === "approved";
          const cancelado = ["cancelled", "rejected", "refunded", "charged_back"].includes(payment.status);

          // Idempotência: bloqueia reprocessamento do mesmo (payment,status) para esta loja.
          const { claimWebhookEvent } = await import("@/lib/mp-webhook-idempotencia.server");
          const { first } = await claimWebhookEvent(paymentId, payment.status, `loja:${lojaId}`, { ref });
          if (!first) return new Response("duplicate", { status: 200 });



          // Nova arquitetura: pedido só nasce após o pagamento confirmar.
          if (ref.startsWith("cat_pendente:")) {
            const pendenteId = ref.slice("cat_pendente:".length);
            if (aprovado) {
              const { data: pedidoId } = await supabaseAdmin.rpc("materializar_pedido_pendente" as any, {
                _pendente_id: pendenteId,
                _mp_payment_id: paymentId,
                _mp_status: payment.status,
              } as any);
              const { aplicarTaxaMpAoPedido, aplicarTaxaMarketplaceAoPedido } = await import("@/lib/mp-taxa.server");
              await aplicarTaxaMpAoPedido(pedidoId as unknown as string | null, payment);
              await aplicarTaxaMarketplaceAoPedido(pedidoId as unknown as string | null, payment);
            } else {
              const upd: Record<string, unknown> = { mp_payment_status: payment.status };
              if (cancelado) upd.status = "cancelado";
              await supabaseAdmin
                .from("pedidos_pendentes_pagamento" as any)
                .update(upd as any)
                .eq("id", pendenteId);
            }
            return new Response("ok", { status: 200 });
          }

          // Compat: pedidos antigos que já estavam em pedidos.aguardando_pagamento
          const pedidoId = ref;
          await supabaseAdmin.rpc("confirmar_pagamento_pedido_legado" as any, {
            _pedido_id: pedidoId,
            _mp_payment_id: paymentId,
            _mp_status: payment.status,
          } as any);

          return new Response("ok", { status: 200 });
        } catch {
          return new Response("error", { status: 500 });
        }
      },
      GET: async () => new Response("ok", { status: 200 }),
    },
  },
});
