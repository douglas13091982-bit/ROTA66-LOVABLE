// Google Maps is no longer used. This file is kept for backward compatibility during migration.
export async function loadGoogleMaps() {
  console.warn("loadGoogleMaps called but Google Maps is deprecated. Use Mapbox instead.");
  return null;
}
