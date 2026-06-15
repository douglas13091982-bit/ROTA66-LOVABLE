import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/mp-webhook-plataforma")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        let payload: any;
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("invalid json", { status: 400 });
        }

        const { getPlataformaMp, mpGetPaymentPlataforma } = await import("@/lib/plataforma-mp.server");
        const cfg = await getPlataformaMp();
        if (!cfg) return new Response("plataforma sem mp", { status: 404 });

        const sigHeader = request.headers.get("x-signature");
        const reqId = request.headers.get("x-request-id");
        const url = new URL(request.url);
        const dataId = url.searchParams.get("data.id") ?? payload?.data?.id;

        if (cfg.webhook_secret && sigHeader && reqId && dataId) {
          const parts = Object.fromEntries(
            sigHeader.split(",").map((p) => {
              const [k, v] = p.split("=");
              return [k.trim(), (v ?? "").trim()];
            }),
          );
          const ts = parts["ts"];
          const v1 = parts["v1"];
          if (ts && v1) {
            const tsNum = Number(ts);
            if (Number.isFinite(tsNum) && Math.abs(Date.now() - tsNum) <= 5 * 60 * 1000) {
              const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
              const expected = createHmac("sha256", cfg.webhook_secret).update(manifest).digest("hex");
              try {
                const a = Buffer.from(v1, "hex");
                const b = Buffer.from(expected, "hex");
                if (a.length !== b.length || !timingSafeEqual(a, b)) {
                  // Assinatura presente mas inválida — não processa.
                  return new Response("invalid signature", { status: 401 });
                }
              } catch {
                return new Response("invalid signature", { status: 401 });
              }
            }
          }
        }

        const paymentId: string | undefined = String(dataId ?? payload?.data?.id ?? "").trim() || undefined;
        if (!paymentId) return new Response("no payment id", { status: 200 });

        const tipo = payload?.type ?? payload?.action ?? url.searchParams.get("type");
        if (tipo && !String(tipo).includes("payment")) return new Response("ignored", { status: 200 });

        try {
          const payment = await mpGetPaymentPlataforma(cfg, paymentId);
          const ref = String(payment.external_reference ?? "");
          if (!ref.startsWith("mensalidade:")) return new Response("not mensalidade", { status: 200 });
          const mensalidadeId = ref.slice("mensalidade:".length);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const aprovado = payment.status === "approved";
          const update: Record<string, unknown> = {
            mp_payment_status: payment.status,
          };
          if (aprovado) {
            update.pago = true;
            update.pago_em = new Date().toISOString();
          }
          await supabaseAdmin
            .from("mensalidades_loja" as any)
            .update(update)
            .eq("id", mensalidadeId);
          return new Response("ok", { status: 200 });
        } catch (e: any) {
          console.error("[mp-webhook-plataforma]", e?.message ?? e);
          return new Response("erro", { status: 500 });
        }
      },
    },
  },
});
