import { i18nConfig } from "./i18n-config";
const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as
  | string
  | undefined;
const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as
  | string
  | undefined;

let mapsLoader: Promise<void> | null = null;

export type AddressSuggestion = {
  placeId: string;
  primary: string;
  secondary: string;
};

export type AddressSelection = {
  endereco: string;
  cidade: string;
  estado: string;
  lat: number | null;
  lng: number | null;
};

export type PlaceSelection = {
  address: string;
  lat: number | null;
  lng: number | null;
};

function mapsReady() {
  return typeof window !== "undefined" && !!(window as any).google?.maps?.importLibrary;
}

function waitForMaps(timeoutMs = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (mapsReady()) return resolve();
      if (Date.now() - start > timeoutMs) {
        return reject(new Error("Google Maps não carregou a tempo"));
      }
      setTimeout(tick, 100);
    };
    tick();
  });
}

export function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  if (mapsReady()) return Promise.resolve();
  if (mapsLoader) return mapsLoader;

  // Outro loader do app pode já ter injetado o script — aguarda ele terminar.
  const existing = document.querySelector<HTMLScriptElement>(
    'script[src*="maps.googleapis.com/maps/api/js"]',
  );
  if (existing) {
    mapsLoader = waitForMaps();
    return mapsLoader;
  }

  if (!BROWSER_KEY) {
    return Promise.reject(new Error("Google Maps browser key indisponível"));
  }
  mapsLoader = new Promise<void>((resolve, reject) => {
    (window as any).__lovableInitMaps = () => {
      waitForMaps().then(resolve, reject);
    };
    const s = document.createElement("script");
    const params = new URLSearchParams({
      key: BROWSER_KEY,
      v: "weekly",
      libraries: "places",
      loading: "async",
      callback: "__lovableInitMaps",
      language: i18nConfig.locale,
      region: "BR",
      loading: "async",
    });
    if (TRACKING_ID) params.set("channel", TRACKING_ID);
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => {
      mapsLoader = null;
      reject(new Error("Falha ao carregar Google Maps"));
    };
    document.head.appendChild(s);
  }).catch((e) => {
    mapsLoader = null;
    throw e;
  });
  return mapsLoader;
}

export async function fetchAutocompleteAddressSuggestions(
  input: string,
  sessionToken?: any,
): Promise<{ suggestions: AddressSuggestion[]; sessionToken: any }> {
  await loadGoogleMaps();
  const places = await (window as any).google.maps.importLibrary("places");
  const { AutocompleteSuggestion, AutocompleteSessionToken } = places;
  const token = sessionToken ?? new AutocompleteSessionToken();
  const { suggestions: result } =
    await AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input,
      sessionToken: token,
      includedRegionCodes: ["br"],
      language: i18nConfig.locale,
      region: "BR",
    });

  const suggestions: AddressSuggestion[] = (result ?? [])
    .map((s: any) => s.placePrediction)
    .filter(Boolean)
    .map((p: any) => ({
      placeId: p.placeId,
      primary: p.mainText?.text ?? p.text?.text ?? "",
      secondary: p.secondaryText?.text ?? "",
    }));

  return { suggestions, sessionToken: token };
}

export async function fetchPlaceDetails(
  suggestion: AddressSuggestion,
): Promise<AddressSelection & PlaceSelection> {
  await loadGoogleMaps();
  const places = await (window as any).google.maps.importLibrary("places");
  const { Place } = places;
  const place = new Place({ id: suggestion.placeId, requestedLanguage: i18nConfig.locale });
  await place.fetchFields({
    fields: ["formattedAddress", "addressComponents", "location", "displayName"],
  });

  const components: any[] = place.addressComponents ?? [];
  const get = (type: string) =>
    components.find((c) => c.types?.includes(type))?.shortText ??
    components.find((c) => c.types?.includes(type))?.longText ??
    "";
  const cidade =
    get("administrative_area_level_2") ||
    get("locality") ||
    get("sublocality") ||
    "";
  const estado = (get("administrative_area_level_1") || "").toUpperCase().slice(0, 2);
  const address =
    place.formattedAddress ??
    `${suggestion.primary}${suggestion.secondary ? ", " + suggestion.secondary : ""}`;
  const loc = place.location;
  const lat = typeof loc?.lat === "function" ? loc.lat() : (loc?.lat ?? null);
  const lng = typeof loc?.lng === "function" ? loc.lng() : (loc?.lng ?? null);

  return { address, endereco: address, cidade, estado, lat, lng };
}

export async function resolveAddressToPlace(
  address: string,
): Promise<AddressSelection & PlaceSelection> {
  const { suggestions } = await fetchAutocompleteAddressSuggestions(address);
  const first = suggestions[0];
  if (!first) throw new Error("Endereço não encontrado no Maps");
  const details = await fetchPlaceDetails(first);
  if (details.lat == null || details.lng == null) {
    throw new Error("Endereço sem coordenadas no Maps");
  }
  return details;
}