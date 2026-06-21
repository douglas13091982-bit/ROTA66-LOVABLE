import { createFileRoute } from "@tanstack/react-router";

/**
 * Cron de fallback: consulta o Mercado Pago para pedidos online ainda
 * `aguardando_pagamento` (criados nas últimas 24h e com `mp_payment_id`)
 * e atualiza o status — cobre casos em que o webhook do MP falhou/atrasou.
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
        const { data: pendentes, error } = await supabaseAdmin
          .from("pedidos")
          .select("id, loja_id, mp_payment_id")
          .eq("status", "aguardando_pagamento")
          .not("mp_payment_id", "is", null)
          .gte("created_at", cutoff)
          .limit(100);

        if (error) {
          console.error("[mp-poll-pendentes] query error", error.message);
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const lojaCache = new Map<string, Awaited<ReturnType<typeof getMpConfigByLojaId>>>();
        let aprovados = 0;
        let cancelados = 0;
        let inalterados = 0;
        let erros = 0;

        for (const p of pendentes ?? []) {
          const lojaId = p.loja_id as string;
          const paymentId = String(p.mp_payment_id);
          try {
            let cfg = lojaCache.get(lojaId);
            if (cfg === undefined) {
              cfg = await getMpConfigByLojaId(lojaId);
              lojaCache.set(lojaId, cfg);
            }
            if (!cfg) {
              erros++;
              continue;
            }

            const payment = await mpGetPayment(cfg.access_token, paymentId);
            const aprovado = payment.status === "approved";
            const cancelado = ["cancelled", "rejected", "refunded", "charged_back"].includes(payment.status);

            const update: Record<string, unknown> = { mp_payment_status: payment.status };
            if (aprovado) {
              update.status = "em_preparo";
              update.pagamento_aprovado_em = new Date().toISOString();
              aprovados++;
            } else if (cancelado) {
              update.status = "cancelado";
              cancelados++;
            } else {
              inalterados++;
            }

            // Só toca quando mudou algo relevante — evita updates ruidosos no realtime.
            if (aprovado || cancelado || (payment.status && payment.status !== "pending")) {
              await supabaseAdmin
                .from("pedidos")
                .update(update as any)
                .eq("id", p.id as string)
                .eq("status", "aguardando_pagamento");
            }
          } catch (e: any) {
            erros++;
            console.error("[mp-poll-pendentes] pedido", p.id, e?.message ?? e);
          }
        }

        return new Response(
          JSON.stringify({
            ok: true,
            varridos: pendentes?.length ?? 0,
            aprovados,
            cancelados,
            inalterados,
            erros,
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
      GET: async () => new Response("ok", { status: 200 }),
    },
  },
});
