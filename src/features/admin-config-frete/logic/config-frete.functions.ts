import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TestInputSchema = z.object({
  apiKey: z.string(),
});

export const testarConexaoGoogleMaps = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => TestInputSchema.parse(data))
  .handler(async () => {
    return { success: false, error: "Google Maps desativado no sistema" };
  });


export const salvarConfigProvedor = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({
    provedor: z.enum(["mapbox"]),
    mapboxToken: z.string().optional(),
    googleKey: z.string().optional(),
  }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const updateData: any = {
      provedor_mapa: data.provedor
    };
    
    if (data.mapboxToken !== undefined) updateData.mapbox_access_token = data.mapboxToken;
    if (data.googleKey !== undefined) updateData.google_maps_api_key = data.googleKey;

    const { error } = await supabaseAdmin
      .from("config_frete")
      .update(updateData)
      .eq("id", "singleton" as any); // Type cast to bypass strict string validation if needed

    if (error) throw error;
    return { success: true };
  });


