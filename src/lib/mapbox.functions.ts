import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import mbxClient from "@mapbox/mapbox-sdk";
import mbxGeocoding from "@mapbox/mapbox-sdk/services/geocoding";
import mbxDirections from "@mapbox/mapbox-sdk/services/directions";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ConfigSchema = z.object({
  accessToken: z.string(),
});

async function getMapboxToken() {
  if (process.env.MAPBOX_ACCESS_TOKEN) return process.env.MAPBOX_ACCESS_TOKEN;
  
  const { data } = await supabaseAdmin
    .from("config_frete")
    .select("mapbox_access_token")
    .eq("id", "singleton")
    .maybeSingle();
    
  return data?.mapbox_access_token;
}

/**
 * Valida se um token do Mapbox é funcional.
 */
export const testarConexaoMapbox = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ConfigSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const geocodingService = mbxGeocoding(mbxClient({ accessToken: data.accessToken }));
      const response = await geocodingService
        .forwardGeocode({
          query: "São Paulo, Brasil",
          limit: 1,
        })
        .send();

      if (response.body && response.body.features) {
        return { success: true };
      }
      return { success: false, error: "Token inválido ou sem permissão" };
    } catch (err: any) {
      return { success: false, error: err.message || "Erro de conexão com Mapbox" };
    }
  });

/**
 * Geocodificação via Mapbox (Server Side)
 */
export const mapboxGeocodificar = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ query: z.string(), proximity: z.array(z.number()).optional() }).parse(data))
  .handler(async ({ data }) => {
    const accessToken = await getMapboxToken();
    if (!accessToken) throw new Error("Mapbox token not configured");

    const geocodingService = mbxGeocoding(mbxClient({ accessToken }));
    const response = await geocodingService
      .forwardGeocode({
        query: data.query,
        countries: ["BR", "MX"],
        proximity: data.proximity as [number, number],
        limit: 5,
      })
      .send();

    return response.body.features.map((f: any) => ({
      id: f.id,
      text: f.text,
      place_name: f.place_name,
      center: f.center, // [lng, lat]
      context: f.context,
    }));
  });

/**
 * Cálculo de rota via Mapbox (Server Side)
 */
export const mapboxCalcularDistancia = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({
    waypoints: z.array(z.object({ lat: z.number(), lng: z.number() })),
  }).parse(data))
  .handler(async ({ data }) => {
    const accessToken = await getMapboxToken();
    if (!accessToken) throw new Error("Mapbox token not configured");

    const directionsService = mbxDirections(mbxClient({ accessToken }));
    const response = await directionsService
      .getDirections({
        profile: "driving", // Mudado para driving simples se driving-traffic falhar ou for muito caro
        waypoints: data.waypoints.map(w => ({ coordinates: [w.lng, w.lat] })),
        geometries: "geojson",
      })
      .send();

    const route = response.body.routes[0];
    if (!route) return { km: null, duration: null };

    return {
      km: route.distance / 1000,
      duration: route.duration, // segundos
      geometry: route.geometry,
    };
  });
