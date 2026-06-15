/**
 * Geometria geográfica. Único lugar com cálculos de distância.
 */

export type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineKm(a: LatLng, b: LatLng): number;
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number;
export function haversineKm(
  aOrLat1: LatLng | number,
  bOrLng1: LatLng | number,
  lat2?: number,
  lng2?: number,
): number {
  const a: LatLng =
    typeof aOrLat1 === "number"
      ? { lat: aOrLat1, lng: bOrLng1 as number }
      : aOrLat1;
  const b: LatLng =
    typeof bOrLng1 === "object"
      ? bOrLng1
      : { lat: lat2 as number, lng: lng2 as number };

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(s));
}

export function ambosDefinidos(
  a: { lat: number | null; lng: number | null } | null,
  b: { lat: number | null; lng: number | null } | null,
): boolean {
  return !!a && !!b && a.lat != null && a.lng != null && b.lat != null && b.lng != null;
}
