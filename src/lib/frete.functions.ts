import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
