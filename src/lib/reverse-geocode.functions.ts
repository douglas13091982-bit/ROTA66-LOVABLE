import { i18nConfig } from "./i18n-config";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

export const reverseGeocode = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z.object({ lat: z.number(), lng: z.number() }).parse(data),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    const connKey =
      process.env.GOOGLE_MAPS_API_KEY ??
      process.env.GOOGLE_MAPS_API_KEY_1 ??
      process.env.GOOGLE_MAPS_API_KEY_2;
    if (!apiKey || !connKey) {
      return { address: null as string | null, cidade: null as string | null, uf: null as string | null, error: "missing_credentials" };
    }
    const url = `${GATEWAY_URL}/maps/api/geocode/json?latlng=${data.lat},${data.lng}&language=${i18nConfig.locale}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Connection-Api-Key": connKey,
      },
    });
    if (!res.ok) {
      return { address: null, cidade: null, uf: null, error: `http_${res.status}` };
    }
    const json: any = await res.json();
    const address = json?.results?.[0]?.formatted_address ?? null;

    let cidade: string | null = null;
    let uf: string | null = null;
    for (const r of (json?.results ?? []) as any[]) {
      for (const comp of (r?.address_components ?? []) as any[]) {
        const types: string[] = comp?.types ?? [];
        if (!cidade && (types.includes("administrative_area_level_2") || types.includes("locality"))) {
          cidade = comp.long_name ?? null;
        }
        if (!uf && types.includes("administrative_area_level_1")) {
          uf = comp.short_name ?? null;
        }
      }
      if (cidade && uf) break;
    }

    return { address, cidade, uf, error: null };
  });

