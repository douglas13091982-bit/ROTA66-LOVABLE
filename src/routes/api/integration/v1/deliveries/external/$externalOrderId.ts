import { createFileRoute } from "@tanstack/react-router";

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function authorized(request: Request) {
  const configured = process.env.ROTA66_INTEGRATION_API_KEY;
  if (!configured) return false;
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const header = request.headers.get("x-rota66-integration-key");
  return bearer === configured || header === configured;
}

function normalizeLogisticsStatus(status: string) {
  switch (status) {
    case "pronto":
      return "waiting_courier";
    case "aceito":
      return "accepted";
    case "em_rota":
      return "on_route_to_pickup";
    case "coletado":
      return "picked_up";
    case "entregue":
      return "delivered";
    case "cancelado":
      return "cancelled";
    default:
      return "pending";
  }
}

export const Route = createFileRoute(
  "/api/integration/v1/deliveries/external/$externalOrderId",
)({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!authorized(request)) return json({ error: "unauthorized" }, 401);

        const externalOrderId = params.externalOrderId?.trim();
        if (!externalOrderId || externalOrderId.length > 120) {
          return json({ error: "external_order_id_invalid" }, 400);
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const { data: integration, error: integrationError } = await supabaseAdmin
          .from("integracao_entregas" as any)
          .select("pedido_id,source,external_order_id")
          .eq("source", "pixel-palace")
          .eq("external_order_id", externalOrderId)
          .maybeSingle();

        if (integrationError) {
          console.error("[pixel-palace-integration] external lookup", integrationError);
          return json({ error: "integration_lookup_failed" }, 500);
        }

        if (!integration?.pedido_id) {
          return json({ error: "delivery_not_found" }, 404);
        }

        const { data: pedido, error: pedidoError } = await supabaseAdmin
          .from("pedidos")
          .select(
            "id,status,entregador_id,taxa_entrega,bonus_entregador,endereco_coleta,endereco_entrega,endereco_coleta_lat,endereco_coleta_lng,endereco_entrega_lat,endereco_entrega_lng,created_at,updated_at,coleta_confirmada_em,entrega_confirmada_em",
          )
          .eq("id", integration.pedido_id)
          .maybeSingle();

        if (pedidoError) {
          console.error("[pixel-palace-integration] delivery lookup", pedidoError);
          return json({ error: "delivery_lookup_failed" }, 500);
        }

        if (!pedido) return json({ error: "delivery_not_found" }, 404);

        return json({
          ok: true,
          delivery: {
            id: pedido.id,
            external_order_id: integration.external_order_id,
            source: integration.source,
            status: pedido.status,
            logistics_status: normalizeLogisticsStatus(pedido.status),
            entregador_id: pedido.entregador_id,
            taxa_entrega: pedido.taxa_entrega,
            bonus_entregador: pedido.bonus_entregador,
            endereco_coleta: pedido.endereco_coleta,
            endereco_entrega: pedido.endereco_entrega,
            endereco_coleta_lat: pedido.endereco_coleta_lat,
            endereco_coleta_lng: pedido.endereco_coleta_lng,
            endereco_entrega_lat: pedido.endereco_entrega_lat,
            endereco_entrega_lng: pedido.endereco_entrega_lng,
            created_at: pedido.created_at,
            updated_at: pedido.updated_at,
            coleta_confirmada_em: pedido.coleta_confirmada_em,
            entrega_confirmada_em: pedido.entrega_confirmada_em,
          },
        });
      },
    },
  },
});
