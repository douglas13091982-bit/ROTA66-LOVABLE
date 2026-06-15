import { createFileRoute } from "@tanstack/react-router";

const MP_BASE = "https://api.mercadopago.com";

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

        const url = new URL(request.url);
        const dataId = url.searchParams.get("data.id") ?? payload?.data?.id;
        const tipo = payload?.type ?? payload?.action ?? url.searchParams.get("type");
        if (tipo && !String(tipo).includes("payment")) {
          return new Response("ignored", { status: 200 });
        }
        if (!dataId) return new Response("no payment id", { status: 200 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: cfg } = await supabaseAdmin
          .from("config_creditos_entregador" as any)
          .select("mp_access_token")
          .eq("singleton", true)
          .maybeSingle();
        const accessToken = (cfg as any)?.mp_access_token;
        if (!accessToken) return new Response("mp não configurado", { status: 200 });

        try {
          const res = await fetch(`${MP_BASE}/v1/payments/${dataId}`, {
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
        } catch (e: any) {
          console.error("[mp-webhook-entregador]", e?.message);
          return new Response("error", { status: 500 });
        }
      },
    },
  },
});
