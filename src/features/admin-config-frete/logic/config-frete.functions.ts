import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TestInputSchema = z.object({
  apiKey: z.string(),
});

export const testarConexaoGoogleMaps = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => TestInputSchema.parse(data))
  .handler(async ({ data }) => {
    const gatewayUrl = "https://connector-gateway.lovable.dev/google_maps";
    const lovableApiKey = process.env.LOVABLE_API_KEY;
    
    if (!lovableApiKey) {
      return { success: false, error: "LOVABLE_API_KEY not configured" };
    }

    try {
      // Testar com Geocoding API (São Paulo como exemplo)
      const resp = await fetch(
        `${gatewayUrl}/maps/api/geocode/json?address=Sao+Paulo&key=${data.apiKey}`,
        {
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "X-Connection-Api-Key": data.apiKey,
          },
        }
      );

      const json = await resp.json();
      if (json.status === "OK") {
        return { success: true };
      }
      return { success: false, error: json.error_message || json.status };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error" };
    }
  });

export const salvarConfigProvedor = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({
    provedor: z.enum(["google", "mapbox"]),
    mapboxToken: z.string().optional(),
    googleKey: z.string().optional(),
  }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { error } = await supabaseAdmin
      .from("config_frete")
      .update({
        provedor_mapa: data.provedor,
        mapbox_access_token: data.mapboxToken,
        google_maps_api_key: data.googleKey,
      })
      .eq("id", "singleton"); // assumindo que existe um registro singleton

    if (error) throw error;
    return { success: true };
  });

