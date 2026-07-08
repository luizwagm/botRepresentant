import type { StoreType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { textSearch, geocodeCity, type PlaceSearchResult } from "./places";
import { normalizeBrazilPhone } from "./phone";
import { isBlacklisted, classifyStoreType } from "./store-classifier";

const KEYWORDS = [
  "loja de roupas",
  "moda feminina",
  "moda masculina",
  "loja de jeans",
  "loja multimarca",
  "boutique",
];

const DEFAULTS = {
  searchRadiusMeters: 8000,
  minRating: 3.8,
  minReviewCount: 3,
  maxResultsPerKeyword: 20,
};

export type HuntCityResult = {
  city: string;
  state: string;
  total: number;
  inserted: number;
  skipped: {
    blacklist: number;
    quality: number;
    noPlaceId: number;
    duplicate: number;
    alreadyListed: number; // ja estava no banco — nao lista de novo
  };
};

type ContactExtraction = { whatsapp: string | null; instagram: string | null };

function extractContact(websiteUri: string | null | undefined): ContactExtraction {
  if (!websiteUri) return { whatsapp: null, instagram: null };

  let whatsapp: string | null = null;
  let instagram: string | null = null;

  const waMatch =
    websiteUri.match(/wa\.me\/(?:\+?55)?(\d+)/i) ??
    websiteUri.match(/whatsapp\.com\/send\?phone=(?:\+?55)?(\d+)/i) ??
    websiteUri.match(/api\.whatsapp\.com\/send\?phone=(?:\+?55)?(\d+)/i);
  if (waMatch && waMatch[1]) {
    whatsapp = normalizeBrazilPhone(waMatch[1]);
  }

  const igMatch = websiteUri.match(/instagram\.com\/([a-zA-Z0-9._]+)/i);
  if (igMatch && igMatch[1]) instagram = igMatch[1];

  return { whatsapp, instagram };
}

export async function huntCity(city: string, state: string): Promise<HuntCityResult> {
  const result: HuntCityResult = {
    city,
    state,
    total: 0,
    inserted: 0,
    skipped: { blacklist: 0, quality: 0, noPlaceId: 0, duplicate: 0, alreadyListed: 0 },
  };

  const geo = await geocodeCity(city, state);
  if (!geo) throw new Error(`Nao consegui geocodear ${city}/${state}`);

  const seen = new Set<string>();

  for (const kw of KEYWORDS) {
    let places: PlaceSearchResult[];
    try {
      places = await textSearch({
        query: `${kw} em ${city} ${state}`,
        locationBias: {
          lat: geo.lat,
          lng: geo.lng,
          radiusMeters: DEFAULTS.searchRadiusMeters,
        },
        maxResultCount: DEFAULTS.maxResultsPerKeyword,
      });
    } catch (err) {
      console.error(`  ! erro buscando "${kw}":`, err instanceof Error ? err.message : err);
      continue;
    }

    for (const p of places) {
      result.total++;
      if (!p.id) {
        result.skipped.noPlaceId++;
        continue;
      }
      if (seen.has(p.id)) {
        result.skipped.duplicate++;
        continue;
      }
      seen.add(p.id);

      const name = p.displayName?.text ?? "(sem nome)";

      if (isBlacklisted(name)) {
        result.skipped.blacklist++;
        continue;
      }

      // Quality gate — toleramos lojas sem rating ainda (novas), mas se tem rating tem que ser bom.
      const rating = p.rating ?? null;
      const reviews = p.userRatingCount ?? 0;
      if (rating !== null && rating < DEFAULTS.minRating) {
        result.skipped.quality++;
        continue;
      }
      if (rating !== null && reviews > 0 && reviews < DEFAULTS.minReviewCount) {
        result.skipped.quality++;
        continue;
      }
      if (p.businessStatus && p.businessStatus !== "OPERATIONAL") {
        result.skipped.quality++;
        continue;
      }

      const rawPhone = p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? null;
      const phoneE164 = normalizeBrazilPhone(rawPhone);
      const { whatsapp: waFromSite, instagram } = extractContact(p.websiteUri);
      const whatsapp = waFromSite ?? phoneE164;
      const storeType: StoreType = classifyStoreType(name, kw);

      // Loja ja listada NAO e listada de novo (nem atualizada) — pulamos.
      const existing = await prisma.lead.findUnique({
        where: { placeId: p.id },
        select: { id: true },
      });
      if (existing) {
        result.skipped.alreadyListed++;
        continue;
      }

      try {
        await prisma.lead.create({
          data: {
            placeId: p.id,
            name,
            city,
            state,
            address: p.formattedAddress ?? null,
            phone: rawPhone,
            whatsapp,
            instagram,
            website: p.websiteUri ?? null,
            lat: p.location?.latitude ?? null,
            lng: p.location?.longitude ?? null,
            rating: p.rating ?? null,
            reviewCount: p.userRatingCount ?? null,
            storeType,
          },
        });
        result.inserted++;
      } catch (e) {
        // Corrida: outra busca simultanea inseriu o mesmo place_id entre o findUnique
        // e o create — trata como ja listada (unique violation P2002), sem derrubar o run.
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          result.skipped.alreadyListed++;
          continue;
        }
        throw e;
      }
    }
  }

  return result;
}
