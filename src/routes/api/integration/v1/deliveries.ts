import { createFileRoute } from "@tanstack/react-router";
import { randomInt } from "node:crypto";

type DeliveryPayload = {
  external_order_id?: string;
  source?: string;
  loja_id?: string;
  cliente_nome?: string;
  cliente_telefone?: string;
  endereco_coleta?: string;
  endereco_coleta_lat?: number | null;
  endereco_coleta_lng?: number | null;
  endereco_entrega?: string;
  endereco_entrega_lat?: number | null;
  endereco_entrega_lng?: number | null;
  cidade?: string | null;
  complemento?: string | null;
  taxa_entrega?: number;
  bonus_entregador?: number;
  codigo_entrega?: string | null;
  observacoes?: string | null;
  valor_total?: number;
};

type IntegrationMapping = { pedido_id: string; source: string; external_order_id: string };

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

function validUuid(value: unknown) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function code() {
  return String(randomInt(0, 10000)).padStart(4, "0");
}

export const Route = createFileRoute("/api/integration/v1/deliveries")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authorized(request)) return json({ error: "unauthorized" }, 401);
        return json({ ok: true, service: "rota66-logistica", version: "v1" });
      },

      POST: async ({ request }) => {
        if (!authorized(request)) return json({ error: "unauthorized" }, 401);

        let body: DeliveryPayload;
        try {
          body = await request.json();
        } catch {
          return json({ error: "invalid_json" }, 400);
        }

        const externalOrderId = body.external_order_id?.trim();
        const source = body.source?.trim() || "pixel-palace";

        if (!externalOrderId || externalOrderId.length > 120) {
          return json({ error: "external_order_id_required" }, 400);
        }
        if (!validUuid(body.loja_id)) {
          return json({ error: "loja_id_invalid" }, 400);
        }
        if (!body.cliente_nome?.trim() || !body.cliente_telefone?.trim()) {
          return json({ error: "cliente_required" }, 400);
        }
        if (!body.endereco_coleta?.trim() || !body.endereco_entrega?.trim()) {
          return json({ error: "addresses_required" }, 400);
        }

        const taxa = Number(body.taxa_entrega ?? 0);
        if (!Number.isFinite(taxa) || taxa < 0) {
          return json({ error: "taxa_entrega_invalid" }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: existing } = await supabaseAdmin
          .from("integracao_entregas" as any)
          .select("pedido_id, source, external_order_id")
          .eq("source", source)
          .eq("external_order_id", externalOrderId)
          .maybeSingle();

        const existingMapping = existing as IntegrationMapping | null;
        if (existingMapping?.pedido_id) {
          const { data: pedido } = await supabaseAdmin
            .from("pedidos")
            .select("id,status,entregador_id,taxa_entrega,codigo_entrega")
            .eq("id", existingMapping.pedido_id)
            .maybeSingle();
          return json({
            ok: true,
            idempotent: true,
            delivery_id: existingMapping.pedido_id,
            status: pedido?.status ?? null,
            logistics_status: pedido?.status ? normalizeLogisticsStatus(pedido.status) : null,
            entregador_id: pedido?.entregador_id ?? null,
            codigo_entrega: pedido?.codigo_entrega ?? null,
          });
        }

        const { data: loja, error: lojaError } = await supabaseAdmin
          .from("lojas")
          .select("id")
          .eq("id", body.loja_id!)
          .maybeSingle();

        if (lojaError) return json({ error: "store_lookup_failed" }, 500);
        if (!loja) return json({ error: "loja_not_found" }, 404);

        const codigoEntrega = body.codigo_entrega?.trim() || code();

        const { data: pedido, error: pedidoError } = await supabaseAdmin
          .from("pedidos")
          .insert({
            loja_id: body.loja_id!,
            cliente_nome: body.cliente_nome.trim(),
            cliente_telefone: body.cliente_telefone.trim(),
            endereco_coleta: body.endereco_coleta.trim(),
            endereco_coleta_lat: body.endereco_coleta_lat ?? null,
            endereco_coleta_lng: body.endereco_coleta_lng ?? null,
            endereco_entrega: body.endereco_entrega.trim(),
            endereco_entrega_lat: body.endereco_entrega_lat ?? null,
            endereco_entrega_lng: body.endereco_entrega_lng ?? null,
            cidade: body.cidade ?? null,
            complemento: body.complemento ?? null,
            observacoes: body.observacoes ?? null,
            taxa_entrega: taxa,
            bonus_entregador: Number(body.bonus_entregador ?? 0) || 0,
            codigo_entrega: codigoEntrega,
            status: "pronto",
            origem: "pixel-palace",
            tipo_entrega: "plataforma",
            entrega_paga: false,
            valor_total: Number(body.valor_total ?? 0) || 0,
            valor_produtos: 0,
            itens: [],
          })
          .select("id,status,entregador_id,taxa_entrega,codigo_entrega")
          .single();

        if (pedidoError || !pedido) {
          console.error("[pixel-palace-integration] create delivery", pedidoError);
          return json({ error: "delivery_create_failed" }, 500);
        }

        const { error: mappingError } = await supabaseAdmin
          .from("integracao_entregas" as any)
          .insert({
            source,
            external_order_id: externalOrderId,
            pedido_id: pedido.id,
          });

        if (mappingError) {
          // Corrida de idempotência: outra requisição criou o vínculo primeiro.
          const { data: winner } = await supabaseAdmin
            .from("integracao_entregas" as any)
            .select("pedido_id")
            .eq("source", source)
            .eq("external_order_id", externalOrderId)
            .maybeSingle();

          const winningMapping = winner as Pick<IntegrationMapping, "pedido_id"> | null;
          if (winningMapping?.pedido_id) {
            await supabaseAdmin.from("pedidos").delete().eq("id", pedido.id);
            return json({
              ok: true,
              idempotent: true,
              delivery_id: winningMapping.pedido_id,
            });
          }

          console.error("[pixel-palace-integration] mapping", mappingError);
          await supabaseAdmin.from("pedidos").delete().eq("id", pedido.id);
          return json({ error: "integration_mapping_failed" }, 500);
        }

        return json({
          ok: true,
          idempotent: false,
          delivery_id: pedido.id,
          status: pedido.status,
          logistics_status: normalizeLogisticsStatus(pedido.status),
          entregador_id: pedido.entregador_id,
          codigo_entrega: pedido.codigo_entrega,
        }, 201);
      },
    },
  },
});
