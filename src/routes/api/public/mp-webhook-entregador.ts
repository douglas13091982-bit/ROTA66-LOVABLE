import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Webhook do Mercado Pago para recargas de saldo do entregador.
 *
 * Unificado com a plataforma: usa o MESMO access token e o MESMO webhook
 * secret armazenados em public.private_config (mp_platform_access_token e
 * mp_platform_webhook_secret). Configurados em Admin → Financeiro.
 */
export const Route = createFileRoute("/api/public/mp-webhook-entregador")({
  server: {
    handlers: {
      GET: async () => new Response("ok", { status: 200 }),
      POST: async ({ request }) => {
        const body = await request.text();
        let payload: any = {};
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("invalid json", { status: 400 });
        }

        const { getPlataformaMp, mpGetPaymentPlataforma } = await import("@/lib/plataforma-mp.server");
        const cfg = await getPlataformaMp();
        if (!cfg) return new Response("plataforma sem mp", { status: 503 });

        const url = new URL(request.url);
        const dataId = url.searchParams.get("data.id") ?? payload?.data?.id;
        const tipo = payload?.type ?? payload?.action ?? url.searchParams.get("type");

        // Verificação obrigatória da assinatura do MP.
        const sigHeader = request.headers.get("x-signature");
        const reqId = request.headers.get("x-request-id");
        if (!sigHeader || !reqId || !dataId) {
          return new Response("missing signature", { status: 401 });
        }
        const parts = Object.fromEntries(
          sigHeader.split(",").map((p) => {
            const [k, v] = p.split("=");
            return [k?.trim() ?? "", (v ?? "").trim()];
          }),
        );
        const ts = parts["ts"];
        const v1 = parts["v1"];
        if (!ts || !v1) return new Response("invalid signature", { status: 401 });
        const tsNum = Number(ts);
        if (!Number.isFinite(tsNum) || Math.abs(Date.now() - tsNum) > 5 * 60 * 1000) {
          return new Response("stale signature", { status: 401 });
        }
        const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
        const expected = createHmac("sha256", cfg.webhook_secret).update(manifest).digest("hex");
        try {
          const a = Buffer.from(v1, "hex");
          const b = Buffer.from(expected, "hex");
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return new Response("invalid signature", { status: 401 });
          }
        } catch {
          return new Response("invalid signature", { status: 401 });
        }

        if (tipo && !String(tipo).includes("payment")) {
          return new Response("ignored", { status: 200 });
        }

        try {
          const payment = await mpGetPaymentPlataforma(cfg, String(dataId));

          const extRef: string = String(payment.external_reference ?? "");
          if (!extRef.startsWith("recarga:")) {
            return new Response("not a recarga", { status: 200 });
          }
          const recargaId = extRef.slice("recarga:".length);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: rec } = await supabaseAdmin
            .from("entregador_recargas_mp" as any)
            .select("id, entregador_id, valor, creditado")
            .eq("id", recargaId)
            .maybeSingle();
          if (!rec) return new Response("recarga not found", { status: 200 });

          const r = rec as any;
          await supabaseAdmin
            .from("entregador_recargas_mp" as any)
            .update({
              status: payment.status,
              mp_payment_id: String(payment.id),
              updated_at: new Date().toISOString(),
            } as any)
            .eq("id", recargaId);

          if (payment.status === "approved" && !r.creditado) {
            // Claim atômico: evita dupla creditação se o MP reenviar o evento.
            const { data: claim } = await supabaseAdmin
              .from("entregador_recargas_mp" as any)
              .update({ creditado: true } as any)
              .eq("id", recargaId)
              .eq("creditado", false)
              .select("id")
              .maybeSingle();
            if (claim) {
              await supabaseAdmin.rpc("aplicar_credito_entregador" as any, {
                _entregador_id: r.entregador_id,
                _delta: Number(r.valor),
                _tipo: "recarga",
                _descricao: `Recarga PIX MP #${payment.id}`,
                _mp_payment_id: String(payment.id),
                _competencia: null,
                _created_by: null,
              });
            }
          }

          return new Response("ok", { status: 200 });
        } catch {
          return new Response("error", { status: 500 });
        }
      },
    },
  },
});
