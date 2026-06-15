import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

const MP_BASE = "https://api.mercadopago.com";

/**
 * Webhook do Mercado Pago para recargas de saldo do entregador.
 *
 * Hardening:
 *  - Verifica assinatura HMAC do MP (header x-signature, manifest oficial)
 *    quando MP_ENTREGADOR_WEBHOOK_SECRET está configurado. Sem o secret
 *    configurado, o endpoint recusa qualquer requisição (fail-closed) para
 *    evitar spoofing de eventos de pagamento.
 *  - Rejeita timestamps fora de janela de 5 minutos (anti-replay).
 *  - Compara assinaturas com timingSafeEqual.
 *  - Não vaza detalhes de erro para o chamador externo.
 */
export const Route = createFileRoute("/api/public/mp-webhook-entregador")({
  server: {
    handlers: {
      GET: async () => new Response("ok", { status: 200 }),
      POST: async ({ request }) => {
        const webhookSecret = process.env.MP_ENTREGADOR_WEBHOOK_SECRET?.trim();
        if (!webhookSecret) {
          // Fail-closed: sem secret, ninguém entra. Configure em Cloud → Secrets.
          return new Response("not configured", { status: 503 });
        }

        const body = await request.text();
        let payload: any = {};
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("invalid json", { status: 400 });
        }

        const url = new URL(request.url);
        const dataId = url.searchParams.get("data.id") ?? payload?.data?.id;
        const tipo = payload?.type ?? payload?.action ?? url.searchParams.get("type");

        // Validação obrigatória da assinatura do MP.
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
        if (!ts || !v1) {
          return new Response("invalid signature", { status: 401 });
        }
        const tsNum = Number(ts);
        if (!Number.isFinite(tsNum) || Math.abs(Date.now() - tsNum) > 5 * 60 * 1000) {
          return new Response("stale signature", { status: 401 });
        }
        const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
        const expected = createHmac("sha256", webhookSecret).update(manifest).digest("hex");
        let okSig = false;
        try {
          const a = Buffer.from(v1, "hex");
          const b = Buffer.from(expected, "hex");
          okSig = a.length === b.length && timingSafeEqual(a, b);
        } catch {
          okSig = false;
        }
        if (!okSig) {
          return new Response("invalid signature", { status: 401 });
        }

        if (tipo && !String(tipo).includes("payment")) {
          return new Response("ignored", { status: 200 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: cfg } = await supabaseAdmin
          .from("config_creditos_entregador" as any)
          .select("mp_access_token")
          .eq("singleton", true)
          .maybeSingle();
        const accessToken = (cfg as any)?.mp_access_token;
        if (!accessToken) return new Response("mp não configurado", { status: 200 });

        try {
          const res = await fetch(`${MP_BASE}/v1/payments/${encodeURIComponent(String(dataId))}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const json: any = await res.json().catch(() => ({}));
          if (!res.ok) return new Response("payment fetch error", { status: 200 });

          const extRef: string = json.external_reference ?? "";
          if (!extRef.startsWith("recarga:")) {
            return new Response("not a recarga", { status: 200 });
          }
          const recargaId = extRef.slice("recarga:".length);

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
              status: json.status,
              mp_payment_id: String(json.id),
              updated_at: new Date().toISOString(),
            } as any)
            .eq("id", recargaId);

          if (json.status === "approved" && !r.creditado) {
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
                _descricao: `Recarga PIX MP #${json.id}`,
                _mp_payment_id: String(json.id),
                _competencia: null,
                _created_by: null,
              });
            }
          }

          return new Response("ok", { status: 200 });
        } catch {
          // Detalhes do erro permanecem apenas em logs internos do provedor de hosting.
          return new Response("error", { status: 500 });
        }
      },
    },
  },
});
