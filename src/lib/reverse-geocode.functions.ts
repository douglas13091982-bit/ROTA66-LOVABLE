import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

export const reverseGeocode = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z.object({ lat: z.number(), lng: z.number() }).parse(data),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    const connKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey || !connKey) {
      return { address: null as string | null, error: "missing_credentials" };
    }
    const url = `${GATEWAY_URL}/maps/api/geocode/json?latlng=${data.lat},${data.lng}&language=pt-BR`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Connection-Api-Key": connKey,
      },
    });
    if (!res.ok) {
      return { address: null, error: `http_${res.status}` };
    }
    const json: any = await res.json();
    const address = json?.results?.[0]?.formatted_address ?? null;
    return { address, error: null };
  });
