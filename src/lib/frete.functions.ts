import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { calcularTarifaPorFaixa } from "@/lib/tarifa-calculator";

const CoordSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

const InputSchema = z.object({
  origem: CoordSchema,
  destino: CoordSchema,
});

/**
 * Calcula a distância real de direção (em km) entre origem e destino
 * usando a Google Routes API. Retorna null se falhar — o cliente deve
 * cair para haversine.
 */
export const calcularDistanciaDirigindo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const gatewayUrl = "https://connector-gateway.lovable.dev/google_maps";
    const apiKey = process.env.LOVABLE_API_KEY;
    const connKey =
      process.env.GOOGLE_MAPS_API_KEY ??
      process.env.GOOGLE_MAPS_API_KEY_1 ??
      process.env.GOOGLE_MAPS_API_KEY_2;
    if (!apiKey || !connKey) {
      console.error("[frete] Missing Google Maps connector credentials");
      return { km: null as number | null };
    }

    try {
      const resp = await fetch(
        `${gatewayUrl}/routes/directions/v2:computeRoutes`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "X-Connection-Api-Key": connKey,
            "Content-Type": "application/json",
            "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
          },
          body: JSON.stringify({
            origin: {
              location: {
                latLng: {
                  latitude: data.origem.lat,
                  longitude: data.origem.lng,
                },
              },
            },
            destination: {
              location: {
                latLng: {
                  latitude: data.destino.lat,
                  longitude: data.destino.lng,
                },
              },
            },
            travelMode: "DRIVE",
            routingPreference: "TRAFFIC_AWARE",
          }),
        },
      );
      if (!resp.ok) {
        const text = await resp.text();
        console.error("[frete] computeRoutes failed", resp.status, text);
        return { km: null as number | null };
      }
      const json = (await resp.json()) as {
        routes?: Array<{ distanceMeters?: number }>;
      };
      const meters = json.routes?.[0]?.distanceMeters;
      if (typeof meters !== "number") return { km: null as number | null };
      return { km: meters / 1000 };
    } catch (err) {
      console.error("[frete] computeRoutes exception", err);
      return { km: null as number | null };
    }
  });

const ReverseSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

/**
 * Reverse geocode: recebe lat/lng e retorna o endereço formatado.
 */
export const reverseGeocode = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ReverseSchema.parse(data))
  .handler(async ({ data }) => {
    const gatewayUrl = "https://connector-gateway.lovable.dev/google_maps";
    const apiKey = process.env.LOVABLE_API_KEY;
    const connKey =
      process.env.GOOGLE_MAPS_API_KEY ??
      process.env.GOOGLE_MAPS_API_KEY_1 ??
      process.env.GOOGLE_MAPS_API_KEY_2;
    if (!apiKey || !connKey) {
      return { address: null as string | null };
    }
    try {
      const resp = await fetch(
        `${gatewayUrl}/maps/api/geocode/json?latlng=${data.lat},${data.lng}&language=pt-BR`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "X-Connection-Api-Key": connKey,
          },
        },
      );
      if (!resp.ok) return { address: null as string | null };
      const json = (await resp.json()) as {
        results?: Array<{ formatted_address?: string }>;
      };
      const address = json.results?.[0]?.formatted_address ?? null;
      return { address };
    } catch {
      return { address: null as string | null };
    }
  });

// ============================================================================
// Pedido avulso — dispara um pedido a partir da página pública /calcular-frete.
// Cria pendente_pagamento em nome da loja "avulsa da plataforma"; após o
// webhook do PIX confirmar, o pedido é materializado e cai direto em `pronto`
// (via trigger pedido_avulsa_auto_pronto), sendo ofertado no pool externo.
// ============================================================================

const AvulsoInputSchema = z.object({
  cliente_nome: z.string().trim().min(2).max(120),
  cliente_telefone: z.string().trim().min(8).max(20),
  descricao_item: z.string().trim().min(3).max(200),
  endereco_coleta: z.string().trim().min(5).max(300),
  endereco_coleta_lat: z.number().min(-90).max(90),
  endereco_coleta_lng: z.number().min(-180).max(180),
  endereco_entrega: z.string().trim().min(5).max(300),
  endereco_entrega_lat: z.number().min(-90).max(90),
  endereco_entrega_lng: z.number().min(-180).max(180),
  complemento: z.string().trim().max(200).optional().nullable(),
  observacoes: z.string().trim().max(500).optional().nullable(),
});

async function fetchDistanciaKm(
  origem: { lat: number; lng: number },
  destino: { lat: number; lng: number },
): Promise<number | null> {
  const gatewayUrl = "https://connector-gateway.lovable.dev/google_maps";
  const apiKey = process.env.LOVABLE_API_KEY;
  const connKey =
    process.env.GOOGLE_MAPS_API_KEY ??
    process.env.GOOGLE_MAPS_API_KEY_1 ??
    process.env.GOOGLE_MAPS_API_KEY_2;
  if (!apiKey || !connKey) return null;
  try {
    const resp = await fetch(`${gatewayUrl}/routes/directions/v2:computeRoutes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Connection-Api-Key": connKey,
        "Content-Type": "application/json",
        "X-Goog-FieldMask": "routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origem.lat, longitude: origem.lng } } },
        destination: { location: { latLng: { latitude: destino.lat, longitude: destino.lng } } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      }),
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as { routes?: Array<{ distanceMeters?: number }> };
    const m = json.routes?.[0]?.distanceMeters;
    return typeof m === "number" ? m / 1000 : null;
  } catch {
    return null;
  }
}

export const criarPedidoAvulso = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => AvulsoInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Descobre a loja avulsa da plataforma via private_config
    const { data: cfg, error: cfgErr } = await supabaseAdmin
      .from("private_config" as any)
      .select("value")
      .eq("key", "loja_avulsa_id")
      .maybeSingle();
    if (cfgErr) throw new Error(cfgErr.message);
    const lojaAvulsaId = (cfg as any)?.value as string | undefined;
    if (!lojaAvulsaId || typeof lojaAvulsaId !== "string") {
      throw new Error("Solicitação de entregador temporariamente indisponível");
    }

    const { data: loja } = await supabaseAdmin
      .from("lojas")
      .select("id, ativa, status, avulsa_plataforma, cidade")
      .eq("id", lojaAvulsaId)
      .maybeSingle();
    if (!loja || !loja.ativa || loja.status !== "aprovado" || !(loja as any).avulsa_plataforma) {
      throw new Error("Solicitação de entregador temporariamente indisponível");
    }

    // 2. Recalcula a taxa NO SERVIDOR — não confia no cliente
    const km = await fetchDistanciaKm(
      { lat: data.endereco_coleta_lat, lng: data.endereco_coleta_lng },
      { lat: data.endereco_entrega_lat, lng: data.endereco_entrega_lng },
    );
    if (km == null) {
      throw new Error("Não foi possível calcular a distância. Tente novamente.");
    }

    const { data: tarifas } = await supabaseAdmin
      .from("tarifas_globais")
      .select("faixa_km_min, faixa_km_max, valor, valor_minimo, valor_por_km")
      .eq("ativa", true)
      .eq("tipo_veiculo", "moto")
      .order("faixa_km_min", { ascending: true });
    const base = calcularTarifaPorFaixa(km, tarifas ?? []);
    if (base == null) {
      throw new Error("Não há tarifa configurada para essa distância");
    }
    // Mesma regra da página pública: adicional do plano Básico (R$ 3).
    const taxa_entrega = Number((base + 3).toFixed(2));
    const valor_total = taxa_entrega;

    const snapshot = {
      cliente_nome: data.cliente_nome,
      cliente_telefone: data.cliente_telefone,
      endereco_entrega: data.endereco_entrega,
      endereco_entrega_lat: data.endereco_entrega_lat,
      endereco_entrega_lng: data.endereco_entrega_lng,
      complemento: data.complemento ?? null,
      cidade: (loja as any).cidade ?? null,
      endereco_coleta: data.endereco_coleta,
      endereco_coleta_lat: data.endereco_coleta_lat,
      endereco_coleta_lng: data.endereco_coleta_lng,
      observacoes:
        (data.observacoes ? data.observacoes + " · " : "") +
        `Pedido avulso: ${data.descricao_item}`,
      forma_pagamento: "pix_online",
      troco_para: null,
      itens: [
        {
          produto_id: null,
          nome: data.descricao_item,
          preco: 0,
          qtd: 1,
          subtotal: 0,
        },
      ],
      valor_produtos: 0,
      taxa_entrega,
      valor_total,
    };

    const { data: pend, error: pendErr } = await supabaseAdmin
      .from("pedidos_pendentes_pagamento" as any)
      .insert({
        loja_id: lojaAvulsaId,
        forma_pagamento: "pix_online",
        valor_total,
        dados: snapshot as any,
        status: "aguardando",
      } as any)
      .select("id")
      .single();
    if (pendErr) throw new Error(pendErr.message);

    return {
      pendente_id: (pend as any).id as string,
      valor_total,
      taxa_entrega,
      distancia_km: Number(km.toFixed(2)),
    };
  });

// Checa se a loja avulsa da plataforma está configurada — usado pela UI
// pública pra desabilitar o botão quando o admin não configurou.
export const checarLojaAvulsaDisponivel = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cfg } = await supabaseAdmin
      .from("private_config" as any)
      .select("value")
      .eq("key", "loja_avulsa_id")
      .maybeSingle();
    const lojaId = (cfg as any)?.value as string | undefined;
    if (!lojaId) return { disponivel: false };
    const { data: loja } = await supabaseAdmin
      .from("lojas")
      .select("ativa, status, avulsa_plataforma")
      .eq("id", lojaId)
      .maybeSingle();
    return {
      disponivel: Boolean(
        loja && loja.ativa && loja.status === "aprovado" && (loja as any).avulsa_plataforma,
      ),
    };
  });
