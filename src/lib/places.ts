import { env } from "./env";

/**
 * Wrapper do Google Places API (New) v1.
 * Doc: https://developers.google.com/maps/documentation/places/web-service/op-overview
 * Field mask e OBRIGATORIO em v1 — billing depende dos campos pedidos.
 */

export type PlaceSearchResult = {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  websiteUri?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  primaryTypeDisplayName?: { text: string };
  businessStatus?: string;
};

const BASE_URL = "https://places.googleapis.com/v1";

const SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
  "places.primaryTypeDisplayName",
  "places.businessStatus",
].join(",");

export type TextSearchOptions = {
  query: string;
  locationBias?: { lat: number; lng: number; radiusMeters: number };
  maxResultCount?: number;
  languageCode?: string;
  regionCode?: string;
};

export async function textSearch(opts: TextSearchOptions): Promise<PlaceSearchResult[]> {
  const url = `${BASE_URL}/places:searchText`;
  const body: Record<string, unknown> = {
    textQuery: opts.query,
    languageCode: opts.languageCode ?? "pt-BR",
    regionCode: opts.regionCode ?? "BR",
    maxResultCount: Math.min(opts.maxResultCount ?? 20, 20),
  };
  if (opts.locationBias) {
    body.locationBias = {
      circle: {
        center: { latitude: opts.locationBias.lat, longitude: opts.locationBias.lng },
        radius: opts.locationBias.radiusMeters,
      },
    };
  }

  const results: PlaceSearchResult[] = [];
  let pageToken: string | undefined;
  const cap = opts.maxResultCount ?? 60;

  do {
    const reqBody = pageToken ? { ...body, pageToken } : body;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": env.googlePlacesApiKey,
        "X-Goog-FieldMask": `${SEARCH_FIELD_MASK},nextPageToken`,
      },
      body: JSON.stringify(reqBody),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Places searchText HTTP ${res.status}: ${txt}`);
    }
    const data = (await res.json()) as {
      places?: PlaceSearchResult[];
      nextPageToken?: string;
    };
    if (data.places) results.push(...data.places);
    pageToken = data.nextPageToken;

    if (results.length >= cap) break;
  } while (pageToken);

  return results;
}

/**
 * Resolve "Caruaru, PE" -> lat/lng usando textSearch (evita habilitar 2a API).
 */
export async function geocodeCity(
  name: string,
  state: string,
): Promise<{ lat: number; lng: number } | null> {
  const results = await textSearch({
    query: `${name}, ${state}, Brasil`,
    maxResultCount: 1,
  });
  const first = results[0];
  if (!first?.location) return null;
  return { lat: first.location.latitude, lng: first.location.longitude };
}
