/**
 * Wrapper para a Google Routes API (computeRouteMatrix).
 * Usa o gateway de connectors da Lovable — não chama o Google diretamente.
 */

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

export type LatLng = { lat: number; lng: number };

export type MatrixCell = {
  originIndex: number;
  destinationIndex: number;
  /** segundos */
  durationSeconds: number;
  /** metros */
  distanceMeters: number;
  ok: boolean;
};

function parseDurationToSeconds(s: string | number | undefined): number {
  if (typeof s === "number") return s;
  if (!s) return Number.POSITIVE_INFINITY;
  // Google retorna no formato "123s"
  const m = String(s).match(/^(\d+)s$/);
  return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
}

/**
 * Calcula a matriz de tempo/distância entre origens e destinos.
 * Retorna `null` se a API falhar — quem chama deve usar fallback.
 */
export async function computeRouteMatrix(
  origins: LatLng[],
  destinations: LatLng[],
): Promise<MatrixCell[] | null> {
  const apiKey = process.env.LOVABLE_API_KEY;
  const connKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !connKey) {
    console.error("[routes] Missing Google Maps connector credentials");
    return null;
  }
  if (origins.length === 0 || destinations.length === 0) return [];

  const body = {
    origins: origins.map((o) => ({
      waypoint: { location: { latLng: { latitude: o.lat, longitude: o.lng } } },
      routeModifiers: { avoid_ferries: false },
    })),
    destinations: destinations.map((d) => ({
      waypoint: { location: { latLng: { latitude: d.lat, longitude: d.lng } } },
    })),
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
  };

  try {
    const resp = await fetch(
      `${GATEWAY_URL}/routes/distanceMatrix/v2:computeRouteMatrix`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "X-Connection-Api-Key": connKey,
          "Content-Type": "application/json",
          "X-Goog-FieldMask":
            "originIndex,destinationIndex,duration,distanceMeters,status,condition",
        },
        body: JSON.stringify(body),
      },
    );
    if (!resp.ok) {
      const text = await resp.text();
      console.error("[routes] computeRouteMatrix failed", resp.status, text);
      return null;
    }
    const data = (await resp.json()) as Array<{
      originIndex: number;
      destinationIndex: number;
      duration?: string;
      distanceMeters?: number;
      condition?: string;
      status?: { code?: number };
    }>;
    return data.map((c) => ({
      originIndex: c.originIndex ?? 0,
      destinationIndex: c.destinationIndex ?? 0,
      durationSeconds: parseDurationToSeconds(c.duration),
      distanceMeters: c.distanceMeters ?? Number.POSITIVE_INFINITY,
      ok:
        (c.status?.code ?? 0) === 0 &&
        (c.condition === undefined || c.condition === "ROUTE_EXISTS"),
    }));
  } catch (err) {
    console.error("[routes] computeRouteMatrix exception", err);
    return null;
  }
}

/** Re-export de `haversineKm` para preservar a API histórica. */
export { haversineKm } from "./geo";
