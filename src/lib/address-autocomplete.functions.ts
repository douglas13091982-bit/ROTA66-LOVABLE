import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { i18nConfig } from "./i18n-config";

const AutocompleteSchema = z.object({
  input: z.string(),
});

const DetailsSchema = z.object({
  placeId: z.string(),
});

export type MapboxSuggestion = {
  placeId: string;
  primary: string;
  secondary: string;
};

/**
 * Servidor: Busca sugestões no Mapbox ou Google
 */
export const fetchAddressSuggestions = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => AutocompleteSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: config } = await supabaseAdmin
      .from("config_frete")
      .select("*")
      .eq("id", "singleton" as any)
      .maybeSingle();

    if ((config as any)?.provedor_mapa === "mapbox" && (config as any)?.mapbox_access_token) {
      const token = (config as any).mapbox_access_token;
      const lang = i18nConfig.locale.split('-')[0];
      const resp = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(data.input)}.json?access_token=${token}&language=${lang}&country=br&types=address,poi,place`
      );
      const json = await resp.json();
      const suggestions: MapboxSuggestion[] = (json.features ?? []).map((f: any) => ({
        placeId: f.id,
        primary: f.text,
        secondary: f.place_name.replace(f.text, "").replace(/^, /, ""),
      }));
      return { suggestions, provider: "mapbox" };
    }

    // Fallback/Default Google via Gateway
    const gatewayUrl = "https://connector-gateway.lovable.dev/google_maps";
    const apiKey = process.env.LOVABLE_API_KEY;
    const connKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey || !connKey) return { suggestions: [], provider: "none" };

    const resp = await fetch(
      `${gatewayUrl}/maps/api/place/autocomplete/json?input=${encodeURIComponent(data.input)}&language=${i18nConfig.locale}&components=country:br`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "X-Connection-Api-Key": connKey,
        },
      }
    );
    const json = await resp.json();
    const suggestions: MapboxSuggestion[] = (json.predictions ?? []).map((p: any) => ({
      placeId: p.place_id,
      primary: p.structured_formatting?.main_text ?? p.description,
      secondary: p.structured_formatting?.secondary_text ?? "",
    }));
    return { suggestions, provider: "google" };
  });

/**
 * Servidor: Busca detalhes de um local
 */
export const fetchAddressDetails = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => DetailsSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: config } = await supabaseAdmin
      .from("config_frete")
      .select("*")
      .eq("id", "singleton" as any)
      .maybeSingle();

    if ((config as any)?.provedor_mapa === "mapbox" && (config as any)?.mapbox_access_token) {
      const token = (config as any).mapbox_access_token;
      const resp = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(data.placeId)}.json?access_token=${token}`
      );
      const json = await resp.json();
      const feature = json.features?.[0];
      if (!feature) throw new Error("Local não encontrado");

      const [lng, lat] = feature.center;
      const context = feature.context ?? [];
      const cidade = context.find((c: any) => c.id.startsWith("place"))?.text ?? "";
      const estado = context.find((c: any) => c.id.startsWith("region"))?.short_code?.split('-')[1] ?? "";

      return {
        endereco: feature.place_name,
        cidade,
        estado,
        lat,
        lng,
      };
    }

    // Google details via Gateway
    const gatewayUrl = "https://connector-gateway.lovable.dev/google_maps";
    const apiKey = process.env.LOVABLE_API_KEY;
    const connKey = process.env.GOOGLE_MAPS_API_KEY;

    const resp = await fetch(
      `${gatewayUrl}/maps/api/place/details/json?place_id=${data.placeId}&language=${i18nConfig.locale}&fields=formatted_address,address_components,geometry`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "X-Connection-Api-Key": connKey,
        },
      }
    );
    const json = await resp.json();
    const result = json.result;
    if (!result) throw new Error("Local não encontrado no Google");

    const comps = result.address_components ?? [];
    const getComp = (t: string) => comps.find((c: any) => c.types.includes(t))?.long_name ?? "";
    const getShort = (t: string) => comps.find((c: any) => c.types.includes(t))?.short_name ?? "";

    return {
      endereco: result.formatted_address,
      cidade: getComp("administrative_area_level_2") || getComp("locality"),
      estado: getShort("administrative_area_level_1"),
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
    };
  });
