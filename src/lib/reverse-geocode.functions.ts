import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { i18nConfig } from "./i18n-config";

const ReverseSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

/**
 * Resolve lat/lng para endereço usando Mapbox ou Google (fallback)
 */
export const reverseGeocode = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ReverseSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: config } = await supabaseAdmin
      .from("config_frete")
      .select("*")
      .eq("id", "singleton" as any)
      .maybeSingle();

    if ((config as any)?.provedor_mapa === "mapbox" && (config as any)?.mapbox_access_token) {
      try {
        const token = (config as any).mapbox_access_token;
        const resp = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${data.lng},${data.lat}.json?access_token=${token}&language=${i18nConfig.locale.split('-')[0]}`
        );
        const json = await resp.json();
        return { address: json.features?.[0]?.place_name ?? null };
      } catch (err) {
        console.error("[reverse-geocode] Mapbox failed, falling back to Google", err);
      }
    }

    // Lógica legado Google
    const gatewayUrl = "https://connector-gateway.lovable.dev/google_maps";
    const apiKey = process.env.LOVABLE_API_KEY;
    const connKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey || !connKey) return { address: null };

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
      const json = await resp.json();
      return { address: json.results?.[0]?.formatted_address ?? null };
    } catch {
      return { address: null };
    }
  });
