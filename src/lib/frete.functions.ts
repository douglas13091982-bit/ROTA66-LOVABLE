import { i18nConfig } from "./i18n-config";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { mapboxCalcularDistancia } from "./mapbox.functions";
import { supabaseAdmin } from "@/integrations/supabase/client.server";


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
    // 1. Verificar provedor configurado
    const { data: config } = await supabaseAdmin
      .from("config_frete")
      .select("*")
      .eq("id", "singleton" as any)
      .maybeSingle();

    if ((config as any)?.provedor_mapa === "mapbox") {
      const res = await mapboxCalcularDistancia({
        data: {
          waypoints: [data.origem, data.destino]
        }
      });
      return { km: res.km };
    }


    // Fallback para Google (lógica atual)

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
        `${gatewayUrl}/maps/api/geocode/json?latlng=${data.lat},${data.lng}&language=${i18nConfig.locale}`,
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

/**
 * Resolve um texto de endereço para coordenadas (lat, lng) e endereço formatado
 * usando a Geocoding API (gateway).
 */
export const geocodificarEndereco = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ endereco: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const gatewayUrl = "https://connector-gateway.lovable.dev/google_maps";
    const apiKey = process.env.LOVABLE_API_KEY;
    const connKey =
      process.env.GOOGLE_MAPS_API_KEY ??
      process.env.GOOGLE_MAPS_API_KEY_1 ??
      process.env.GOOGLE_MAPS_API_KEY_2;

    if (!apiKey || !connKey) {
      throw new Error("Credenciais do Google Maps não configuradas");
    }

    const response = await fetch(
      `${gatewayUrl}/maps/api/geocode/json?address=${encodeURIComponent(data.endereco)}&language=${i18nConfig.locale}&region=BR`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "X-Connection-Api-Key": connKey,
        },
      }
    );

    if (response.status === 403) {
      const body = await response.json().catch(() => ({}));
      const reason = body?.error?.details?.find((d: any) => d.reason)?.reason;
      if (reason === "API_KEY_HTTP_REFERRER_BLOCKED") {
        throw new Error("Chave do Google Maps bloqueada por referer no servidor.");
      }
      throw new Error("Acesso negado ao Google Maps (403)");
    }

    if (!response.ok) {
      throw new Error(`Erro no Google Maps: ${response.status}`);
    }

    const body = await response.json();
    const result = body.results?.[0];

    if (!result) {
      return { success: false, error: "Endereço não localizado" };
    }

    return {
      success: true,
      address: result.formatted_address,
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
    };
  });

