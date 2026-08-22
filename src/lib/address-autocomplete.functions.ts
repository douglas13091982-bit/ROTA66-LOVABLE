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

    const token = (config as any)?.mapbox_access_token;
    if (token) {
      const lang = i18nConfig.locale.split('-')[0];
      const resp = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(data.input)}.json?access_token=${token}&language=${lang}&country=br,mx&types=address,poi,place`
      );
      const json = await resp.json();
      const suggestions: MapboxSuggestion[] = (json.features ?? []).map((f: any) => ({
        placeId: f.id,
        primary: f.text,
        secondary: f.place_name.replace(f.text, "").replace(/^, /, ""),
      }));
      return { suggestions, provider: "mapbox" };
    }

    return { suggestions: [], provider: "none" };
  });

/**
 * Servidor: Busca detalhes de um local (Mapbox Only)
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

    const token = (config as any)?.mapbox_access_token;
    if (token) {
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

    throw new Error("Mapbox não configurado");
  });

