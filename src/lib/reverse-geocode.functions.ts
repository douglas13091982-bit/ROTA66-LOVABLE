import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { i18nConfig } from "./i18n-config";

const ReverseSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export type ReverseGeocodeResult = {
  address: string | null;
  cidade: string | null;
  uf: string | null;
};

/**
 * Resolve lat/lng para endereço usando Mapbox ou Google (fallback)
 */
export const reverseGeocode = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ReverseSchema.parse(data))
  .handler(async ({ data }): Promise<ReverseGeocodeResult> => {
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
        const feature = json.features?.[0];
        
        let cidade = null;
        let uf = null;

        if (feature?.context) {
          cidade = feature.context.find((c: any) => c.id.startsWith("place"))?.text ?? null;
          uf = feature.context.find((c: any) => c.id.startsWith("region"))?.short_code?.split('-')[1] ?? null;
        }

        return { 
          address: feature?.place_name ?? null,
          cidade,
          uf
        };
      } catch (err) {
        console.error("[reverse-geocode] Mapbox failed, falling back to Google", err);
      }
    }

    return { address: null, cidade: null, uf: null };

  });
