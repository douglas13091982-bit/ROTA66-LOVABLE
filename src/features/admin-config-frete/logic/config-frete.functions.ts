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
