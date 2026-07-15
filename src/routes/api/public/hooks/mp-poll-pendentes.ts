import { createFileRoute } from "@tanstack/react-router";

/**
 * Cron de fallback: consulta o Mercado Pago para pagamentos do catálogo
 * ainda pendentes (criados nas últimas 24h e com `mp_payment_id`) e:
 *   - se aprovado: materializa o pedido em `public.pedidos`
 *   - se cancelado/rejeitado: marca o pendente como cancelado
 * Cobre casos em que o webhook do MP falhou/atrasou.
 *
 * Também cobre pedidos antigos (compatibilidade) que ainda estão em
 * `pedidos.aguardando_pagamento`.
 *
 * Auth: header `apikey` deve bater com SUPABASE_PUBLISHABLE_KEY.
 * É chamado pelo pg_cron a cada 5 minutos.
 */
export const Route = createFileRoute("/api/public/hooks/mp-poll-pendentes")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? request.headers.get("x-api-key");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!expected || apikey !== expected) {
          return new Response("unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { getMpConfigByLojaId, mpGetPayment } = await import("@/lib/mercadopago.server");

        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const lojaCache = new Map<string, Awaited<ReturnType<typeof getMpConfigByLojaId>>>();
        let aprovados = 0;
        let cancelados = 0;
        let inalterados = 0;
        let erros = 0;
        let varridos = 0;

        // 1) Pendentes na nova tabela
        const { data: pendentes } = await supabaseAdmin
          .from("pedidos_pendentes_pagamento" as any)
          .select("id, loja_id, mp_payment_id, status")
          .eq("status", "aguardando")
          .not("mp_payment_id", "is", null)
          .gte("created_at", cutoff)
          .limit(100);

        varridos += pendentes?.length ?? 0;
        for (const p of (pendentes ?? []) as any[]) {
          const lojaId = p.loja_id as string;
          const paymentId = String(p.mp_payment_id);
          try {
            let cfg = lojaCache.get(lojaId);
            if (cfg === undefined) {
              cfg = await getMpConfigByLojaId(lojaId);
              lojaCache.set(lojaId, cfg);
            }
            if (!cfg) { erros++; continue; }
            const payment = await mpGetPayment(cfg.access_token, paymentId);
            const aprovado = payment.status === "approved";
            const cancelado = ["cancelled", "rejected", "refunded", "charged_back"].includes(payment.status);
            if (aprovado) {
              const { data: pedidoId } = await supabaseAdmin.rpc("materializar_pedido_pendente" as any, {
                _pendente_id: p.id,
                _mp_payment_id: paymentId,
                _mp_status: payment.status,
              } as any);
              const { aplicarTaxaMpAoPedido, aplicarTaxaMarketplaceAoPedido } = await import("@/lib/mp-taxa.server");
              await aplicarTaxaMpAoPedido(pedidoId as unknown as string | null, payment);
              await aplicarTaxaMarketplaceAoPedido(pedidoId as unknown as string | null, payment);
              aprovados++;
            } else if (cancelado) {
              await supabaseAdmin
                .from("pedidos_pendentes_pagamento" as any)
                .update({ status: "cancelado", mp_payment_status: payment.status } as any)
                .eq("id", p.id);
              cancelados++;
            } else {
              if (payment.status && payment.status !== "pending") {
                await supabaseAdmin
                  .from("pedidos_pendentes_pagamento" as any)
                  .update({ mp_payment_status: payment.status } as any)
                  .eq("id", p.id);
              }
              inalterados++;
            }
          } catch (e: any) {
            erros++;
            console.error("[mp-poll-pendentes] pendente", p.id, e?.message ?? e);
          }
        }

        // 2) Compat: pedidos legados ainda em aguardando_pagamento
        const { data: legados } = await supabaseAdmin
          .from("pedidos")
          .select("id, loja_id, mp_payment_id")
          .eq("status", "aguardando_pagamento")
          .not("mp_payment_id", "is", null)
          .gte("created_at", cutoff)
          .limit(100);

        varridos += legados?.length ?? 0;
        for (const p of legados ?? []) {
          const lojaId = p.loja_id as string;
          const paymentId = String(p.mp_payment_id);
          try {
            let cfg = lojaCache.get(lojaId);
            if (cfg === undefined) {
              cfg = await getMpConfigByLojaId(lojaId);
              lojaCache.set(lojaId, cfg);
            }
            if (!cfg) { erros++; continue; }
            const payment = await mpGetPayment(cfg.access_token, paymentId);
            const aprovado = payment.status === "approved";
            const cancelado = ["cancelled", "rejected", "refunded", "charged_back"].includes(payment.status);
            if (aprovado || cancelado || (payment.status && payment.status !== "pending")) {
              const { error: rpcErr } = await supabaseAdmin.rpc(
                "confirmar_pagamento_pedido_legado" as any,
                {
                  _pedido_id: p.id as string,
                  _mp_payment_id: paymentId,
                  _mp_status: payment.status,
                } as any,
              );
              if (rpcErr) {
                erros++;
                console.error("[mp-poll-pendentes] rpc legado", p.id, rpcErr.message);
                continue;
              }
            }
            if (aprovado) {
              const { aplicarTaxaMpAoPedido, aplicarTaxaMarketplaceAoPedido } = await import("@/lib/mp-taxa.server");
              await aplicarTaxaMpAoPedido(p.id as string, payment);
              await aplicarTaxaMarketplaceAoPedido(p.id as string, payment);
              aprovados++;
            } else if (cancelado) cancelados++;
            else inalterados++;
          } catch (e: any) {
            erros++;
            console.error("[mp-poll-pendentes] legado", p.id, e?.message ?? e);
          }
        }

        return new Response(
          JSON.stringify({ ok: true, varridos, aprovados, cancelados, inalterados, erros }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
      GET: async () => new Response("ok", { status: 200 }),
    },
  },
});
