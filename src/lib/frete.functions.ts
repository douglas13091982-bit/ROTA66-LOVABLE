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


    return { km: null };

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
    const res = await reverseGeocode({ data });
    return { address: res.address };
  });


/**
 * Resolve um texto de endereço para coordenadas (lat, lng) e endereço formatado
 * usando Mapbox ou Google (gateway).
 */
export const geocodificarEndereco = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ endereco: z.string() }).parse(data))
  .handler(async ({ data }) => {
    // 1. Verificar provedor configurado
    const { data: config } = await supabaseAdmin
      .from("config_frete")
      .select("*")
      .eq("id", "singleton" as any)
      .maybeSingle();

    if ((config as any)?.provedor_mapa === "mapbox" && (config as any)?.mapbox_access_token) {
      try {
        const token = (config as any).mapbox_access_token;
        const lang = i18nConfig.locale.split("-")[0];
        const resp = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(data.endereco)}.json?access_token=${token}&language=${lang}&country=br&limit=1`,
        );
        const json = await resp.json();
        const feature = json.features?.[0];

        if (feature) {
          const [lng, lat] = feature.center;
          return {
            success: true,
            address: feature.place_name,
            lat,
            lng,
          };
        }
      } catch (err) {
        console.error("[geocodificarEndereco] Mapbox failed, falling back to Google", err);
      }
    }

    return { success: false, error: "Mapbox não configurado" };

  });

