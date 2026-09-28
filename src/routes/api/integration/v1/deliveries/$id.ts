import { createFileRoute } from "@tanstack/react-router";

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function authorized(request: Request) {
  const configured = process.env.ROTA66_INTEGRATION_API_KEY;
  if (!configured) return false;
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const header = request.headers.get("x-rota66-integration-key");
  return bearer === configured || header === configured;
}

export const Route = createFileRoute("/api/integration/v1/deliveries/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!authorized(request)) return json({ error: "unauthorized" }, 401);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: pedido, error } = await supabaseAdmin
          .from("pedidos")
          .select("id,status,entregador_id,taxa_entrega,codigo_coleta,codigo_entrega,endereco_coleta,endereco_entrega,created_at,updated_at")
          .eq("id", params.id)
          .maybeSingle();
        if (error) return json({ error: "delivery_lookup_failed" }, 500);
        if (!pedido) return json({ error: "delivery_not_found" }, 404);
        return json({ ok: true, delivery: pedido });
      },

      POST: async ({ request, params }) => {
        if (!authorized(request)) return json({ error: "unauthorized" }, 401);
        let body: { action?: string };
        try { body = await request.json(); } catch { body = {}; }
        if (body.action !== "cancel") return json({ error: "unsupported_action" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("pedidos")
          .update({ status: "cancelado" })
          .eq("id", params.id)
          .in("status", ["pronto", "aceito"])
          .select("id,status")
          .maybeSingle();

        if (error) return json({ error: "delivery_cancel_failed" }, 500);
        if (!data) return json({ error: "delivery_not_cancellable" }, 409);
        return json({ ok: true, delivery: data });
      },
    },
  },
});
