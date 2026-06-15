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

        // Validação obrigatória da assinatura do MP quando o segredo do webhook está configurado.
        const sigHeader = request.headers.get("x-signature");
        const reqId = request.headers.get("x-request-id");
        const url = new URL(request.url);
        const dataId = url.searchParams.get("data.id") ?? payload?.data?.id;
        if (cfg.webhook_secret) {
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
          // Rejeita timestamps fora de uma janela de 5 minutos para evitar replays.
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
        }

        const paymentId: string | undefined = String(dataId ?? payload?.data?.id ?? "").trim() || undefined;
        if (!paymentId) return new Response("no payment id", { status: 200 });

        const tipo = payload?.type ?? payload?.action ?? url.searchParams.get("type");
        if (tipo && !String(tipo).includes("payment")) {
          return new Response("ignored", { status: 200 });
        }

        try {
          const payment = await mpGetPayment(cfg.access_token, paymentId);
          const pedidoId = payment.external_reference as unknown as string;
          if (!pedidoId) return new Response("no external_reference", { status: 200 });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const aprovado = payment.status === "approved";
          const cancelado = ["cancelled", "rejected", "refunded", "charged_back"].includes(payment.status);

          const update: Record<string, unknown> = {
            mp_payment_status: payment.status,
          };
          if (aprovado) {
            update.status = "em_preparo";
            update.pagamento_aprovado_em = new Date().toISOString();
          } else if (cancelado) {
            update.status = "cancelado";
          }

          await supabaseAdmin
            .from("pedidos")
            .update(update as any)
            .eq("id", pedidoId)
            .eq("loja_id", lojaId);

          return new Response("ok", { status: 200 });
        } catch (e: any) {
          console.error("[mp-webhook]", e?.message);
          return new Response("error", { status: 500 });
        }
      },
      GET: async () => new Response("ok", { status: 200 }),
    },
  },
});
