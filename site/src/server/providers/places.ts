import { db, nowIso } from "../db";

/**
 * Place-discovery provider abstraction.
 * - GooglePlacesProvider activates when GOOGLE_MAPS_SERVER_API_KEY is set
 *   (Places API (New) text search with field masks, cached in place_cache).
 * - DevPlacesProvider is the labeled fallback so the product works with no
 *   commercial keys. Every dev result carries source: "dev".
 */

export interface Place {
  placeId: string;
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  priceLevel?: number;
  openNow?: boolean;
  familyFriendly?: boolean;
  photoUrl?: string;
  phone?: string;
  hours?: string[];
  summary?: string;
  source: "google" | "dev" | "package";
}

export interface PlaceQuery {
  q?: string;
  category?: string;
  nearLat?: number;
  nearLng?: number;
  destination?: string;
  openNow?: boolean;
  minRating?: number;
  maxPrice?: number;
  familyFriendly?: boolean;
}

export interface PlacesProvider {
  readonly id: string;
  readonly liveData: boolean;
  search(q: PlaceQuery): Promise<Place[]>;
  details(placeId: string): Promise<Place | null>;
}

/* ── Development dataset (clearly labeled, never claims live data) ── */

type DevSeed = Omit<Place, "source">;
const CITY: Record<string, { lat: number; lng: number; places: DevSeed[] }> = {
  istanbul: {
    lat: 41.0082, lng: 28.9784,
    places: [
      { placeId: "dev-ist-1", name: "Hagia Sophia", category: "religious", address: "Sultan Ahmet, Fatih", lat: 41.0086, lng: 28.9802, rating: 4.8, priceLevel: 2, familyFriendly: true, hours: ["09:00-19:00"], summary: "Iconic Byzantine landmark." },
      { placeId: "dev-ist-2", name: "Blue Mosque", category: "religious", address: "Sultan Ahmet", lat: 41.0054, lng: 28.9768, rating: 4.7, priceLevel: 0, familyFriendly: true, hours: ["08:30-18:30"], summary: "Ottoman imperial mosque." },
      { placeId: "dev-ist-3", name: "Grand Bazaar", category: "shopping", address: "Beyazıt", lat: 41.0106, lng: 28.968, rating: 4.5, priceLevel: 2, familyFriendly: true, hours: ["09:00-19:00"], summary: "Historic covered market." },
      { placeId: "dev-ist-4", name: "Topkapı Palace", category: "museum", address: "Cankurtaran", lat: 41.0115, lng: 28.9834, rating: 4.7, priceLevel: 3, familyFriendly: true, hours: ["09:00-18:00"], summary: "Ottoman palace museum." },
      { placeId: "dev-ist-5", name: "Bosphorus Cruise Dock", category: "attraction", address: "Eminönü", lat: 41.0175, lng: 28.972, rating: 4.6, priceLevel: 2, familyFriendly: true, hours: ["10:00-20:00"], summary: "Strait sightseeing cruises." },
      { placeId: "dev-ist-6", name: "Sultanahmet Köftecisi", category: "restaurant", address: "Divanyolu Cd.", lat: 41.0091, lng: 28.9744, rating: 4.4, priceLevel: 2, openNow: true, familyFriendly: true, hours: ["11:00-23:00"], summary: "Famous meatball house." },
      { placeId: "dev-ist-7", name: "Hafız Mustafa 1864", category: "cafe", address: "Hocapaşa", lat: 41.0129, lng: 28.9758, rating: 4.6, priceLevel: 2, openNow: true, familyFriendly: true, hours: ["08:00-24:00"], summary: "Historic sweets & baklava." },
      { placeId: "dev-ist-8", name: "Gülhane Park", category: "park", address: "Cankurtaran", lat: 41.0136, lng: 28.9814, rating: 4.6, priceLevel: 0, familyFriendly: true, hours: ["06:00-22:30"], summary: "Rose-garden park by Topkapı." },
      { placeId: "dev-ist-9", name: "Basilica Cistern", category: "attraction", address: "Alemdar", lat: 41.0084, lng: 28.9779, rating: 4.6, priceLevel: 3, familyFriendly: true, hours: ["09:00-19:00"], summary: "Atmospheric underground cistern." },
      { placeId: "dev-ist-10", name: "Four Seasons Sultanahmet", category: "hotel", address: "Tevkifhane Sk.", lat: 41.0063, lng: 28.9797, rating: 4.8, priceLevel: 4, summary: "Luxury heritage hotel." },
    ],
  },
  riyadh: {
    lat: 24.7136, lng: 46.6753,
    places: [
      { placeId: "dev-ruh-1", name: "Kingdom Centre Sky Bridge", category: "attraction", address: "Al Olaya", lat: 24.7114, lng: 46.6745, rating: 4.6, priceLevel: 3, familyFriendly: true, hours: ["10:00-23:00"], summary: "Panoramic city views." },
      { placeId: "dev-ruh-2", name: "Diriyah At-Turaif", category: "attraction", address: "Diriyah", lat: 24.7343, lng: 46.5765, rating: 4.7, priceLevel: 2, familyFriendly: true, hours: ["09:00-22:00"], summary: "UNESCO mud-brick district." },
      { placeId: "dev-ruh-3", name: "National Museum", category: "museum", address: "King Abdul Aziz Historical Center", lat: 24.6478, lng: 46.7106, rating: 4.7, priceLevel: 1, familyFriendly: true, hours: ["09:00-19:00"], summary: "Saudi history & culture." },
      { placeId: "dev-ruh-4", name: "Boulevard Riyadh City", category: "entertainment", address: "Hittin", lat: 24.7681, lng: 46.6068, rating: 4.5, priceLevel: 3, openNow: true, familyFriendly: true, hours: ["16:00-02:00"], summary: "Dining & entertainment district." },
      { placeId: "dev-ruh-5", name: "Najd Village Restaurant", category: "restaurant", address: "Al Takhassusi St.", lat: 24.6935, lng: 46.6685, rating: 4.5, priceLevel: 2, openNow: true, familyFriendly: true, hours: ["12:00-24:00"], summary: "Traditional Najdi cuisine." },
      { placeId: "dev-ruh-6", name: "Wadi Hanifa", category: "nature", address: "Wadi Hanifa", lat: 24.6096, lng: 46.5966, rating: 4.5, priceLevel: 0, familyFriendly: true, hours: ["24h"], summary: "Restored valley parkland." },
      { placeId: "dev-ruh-7", name: "Edge of the World", category: "adventure" as never, address: "Tuwaiq escarpment", lat: 24.9426, lng: 45.9903, rating: 4.8, priceLevel: 1, summary: "Dramatic cliff viewpoint." },
      { placeId: "dev-ruh-8", name: "Ritz-Carlton Riyadh", category: "hotel", address: "Al Hada", lat: 24.6706, lng: 46.6236, rating: 4.8, priceLevel: 4, summary: "Palatial luxury hotel." },
    ],
  },
  jeddah: {
    lat: 21.4858, lng: 39.1925,
    places: [
      { placeId: "dev-jed-1", name: "Al-Balad Historic District", category: "attraction", address: "Al-Balad", lat: 21.4837, lng: 39.1862, rating: 4.6, priceLevel: 0, familyFriendly: true, hours: ["09:00-23:00"], summary: "UNESCO coral-stone old town." },
      { placeId: "dev-jed-2", name: "Jeddah Corniche", category: "park", address: "Corniche Rd.", lat: 21.6003, lng: 39.1074, rating: 4.6, priceLevel: 0, openNow: true, familyFriendly: true, hours: ["24h"], summary: "Waterfront promenade." },
      { placeId: "dev-jed-3", name: "Fakieh Aquarium", category: "family", address: "Corniche", lat: 21.5763, lng: 39.1082, rating: 4.4, priceLevel: 3, familyFriendly: true, hours: ["10:00-22:00"], summary: "Red Sea marine life." },
      { placeId: "dev-jed-4", name: "Al Khayyam Restaurant", category: "restaurant", address: "Al Andalus", lat: 21.543, lng: 39.173, rating: 4.4, priceLevel: 2, openNow: true, familyFriendly: true, hours: ["13:00-01:00"], summary: "Seafood & grills." },
    ],
  },
  london: {
    lat: 51.5074, lng: -0.1278,
    places: [
      { placeId: "dev-lon-1", name: "British Museum", category: "museum", address: "Great Russell St", lat: 51.5194, lng: -0.127, rating: 4.8, priceLevel: 0, familyFriendly: true, hours: ["10:00-17:00"], summary: "World-famous collections." },
      { placeId: "dev-lon-2", name: "Tower of London", category: "attraction", address: "Tower Hill", lat: 51.5081, lng: -0.0759, rating: 4.7, priceLevel: 3, familyFriendly: true, hours: ["09:00-17:30"], summary: "Historic royal fortress." },
      { placeId: "dev-lon-3", name: "Hyde Park", category: "park", address: "W2", lat: 51.5073, lng: -0.1657, rating: 4.7, priceLevel: 0, openNow: true, familyFriendly: true, hours: ["05:00-24:00"], summary: "Royal park boating & lawns." },
      { placeId: "dev-lon-4", name: "Dishoom Covent Garden", category: "restaurant", address: "12 Upper St Martin's Ln", lat: 51.5127, lng: -0.1269, rating: 4.7, priceLevel: 2, openNow: true, familyFriendly: true, hours: ["08:00-23:00"], summary: "Bombay-style café." },
    ],
  },
};

const CITY_ALIASES: Record<string, string> = {
  istanbul: "istanbul", "إسطنبول": "istanbul", riyadh: "riyadh", "الرياض": "riyadh",
  jeddah: "jeddah", "جدة": "jeddah", london: "london", "لندن": "london",
};

function nearestCity(lat?: number, lng?: number, destination?: string): string {
  if (destination) {
    const key = CITY_ALIASES[destination.trim().toLowerCase()] ?? Object.keys(CITY).find((c) => destination.toLowerCase().includes(c));
    if (key) return key;
  }
  if (lat != null && lng != null) {
    let best = "istanbul";
    let bd = Infinity;
    for (const [k, v] of Object.entries(CITY)) {
      const d = (v.lat - lat) ** 2 + (v.lng - lng) ** 2;
      if (d < bd) {
        bd = d;
        best = k;
      }
    }
    return best;
  }
  return "istanbul";
}

class DevPlacesProvider implements PlacesProvider {
  readonly id = "dev";
  readonly liveData = false;
  async search(q: PlaceQuery): Promise<Place[]> {
    const city = nearestCity(q.nearLat, q.nearLng, q.destination);
    let out = CITY[city].places.map((p) => ({ ...p, source: "dev" as const }));
    if (q.q) {
      const needle = q.q.toLowerCase();
      out = out.filter((p) => p.name.toLowerCase().includes(needle) || p.category.includes(needle) || (p.summary ?? "").toLowerCase().includes(needle));
    }
    if (q.category) out = out.filter((p) => p.category === q.category);
    if (q.minRating) out = out.filter((p) => (p.rating ?? 0) >= q.minRating!);
    if (q.maxPrice != null) out = out.filter((p) => (p.priceLevel ?? 0) <= q.maxPrice!);
    if (q.openNow) out = out.filter((p) => p.openNow !== false);
    if (q.familyFriendly) out = out.filter((p) => p.familyFriendly);
    return out;
  }
  async details(placeId: string): Promise<Place | null> {
    for (const c of Object.values(CITY)) {
      const p = c.places.find((x) => x.placeId === placeId);
      if (p) return { ...p, source: "dev" };
    }
    return null;
  }
}

/* ── Google Places (New) adapter — active only with a server key ── */

class GooglePlacesProvider implements PlacesProvider {
  readonly id = "google";
  readonly liveData = true;
  constructor(private key: string) {}

  async search(q: PlaceQuery): Promise<Place[]> {
    const cached = cacheKeyed(`s:${JSON.stringify(q)}`);
    if (cached) return cached as Place[];
    const body: Record<string, unknown> = {
      textQuery: [q.q, q.category, q.destination].filter(Boolean).join(" ") || "attractions",
      maxResultCount: 12,
    };
    if (q.nearLat != null && q.nearLng != null) {
      body.locationBias = { circle: { center: { latitude: q.nearLat, longitude: q.nearLng }, radius: 15000 } };
    }
    if (q.minRating) body.minRating = q.minRating;
    if (q.openNow) body.openNow = true;
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.key,
        // Field mask keeps cost per request minimal.
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.currentOpeningHours.openNow,places.primaryTypeDisplayName",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`places_upstream_${res.status}`);
    const data = (await res.json()) as { places?: Array<Record<string, never>> };
    const out: Place[] = (data.places ?? []).map((p: Record<string, unknown>) => ({
      placeId: String(p.id),
      name: String((p.displayName as { text?: string })?.text ?? "Place"),
      category: q.category ?? String((p.primaryTypeDisplayName as { text?: string })?.text ?? "attraction").toLowerCase(),
      address: String(p.formattedAddress ?? ""),
      lat: Number((p.location as { latitude?: number })?.latitude ?? 0),
      lng: Number((p.location as { longitude?: number })?.longitude ?? 0),
      rating: p.rating as number | undefined,
      openNow: (p.currentOpeningHours as { openNow?: boolean })?.openNow,
      source: "google",
    }));
    cachePut(`s:${JSON.stringify(q)}`, out);
    return out;
  }

  async details(placeId: string): Promise<Place | null> {
    const hit = cacheKeyed(`d:${placeId}`);
    if (hit) return hit as Place;
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": this.key,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,location,rating,priceLevel,internationalPhoneNumber,regularOpeningHours.weekdayDescriptions",
      },
    });
    if (!res.ok) return null;
    const p = (await res.json()) as Record<string, unknown>;
    const place: Place = {
      placeId: String(p.id),
      name: String((p.displayName as { text?: string })?.text ?? "Place"),
      category: "attraction",
      address: String(p.formattedAddress ?? ""),
      lat: Number((p.location as { latitude?: number })?.latitude ?? 0),
      lng: Number((p.location as { longitude?: number })?.longitude ?? 0),
      rating: p.rating as number | undefined,
      phone: p.internationalPhoneNumber as string | undefined,
      hours: (p.regularOpeningHours as { weekdayDescriptions?: string[] })?.weekdayDescriptions,
      source: "google",
    };
    cachePut(`d:${placeId}`, place);
    return place;
  }
}

const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h
function cacheKeyed(key: string): unknown | null {
  const row = db().prepare("SELECT data, fetched_at FROM place_cache WHERE place_id = ?").get(key) as { data: string; fetched_at: string } | undefined;
  if (!row || Date.now() - Date.parse(row.fetched_at) > CACHE_TTL_MS) return null;
  try {
    return JSON.parse(row.data);
  } catch {
    return null;
  }
}
function cachePut(key: string, data: unknown) {
  db().prepare(
    "INSERT INTO place_cache (place_id, provider, data, fetched_at) VALUES (?, 'google', ?, ?) ON CONFLICT(place_id) DO UPDATE SET data = excluded.data, fetched_at = excluded.fetched_at"
  ).run(key, JSON.stringify(data), nowIso());
}

export function placesProvider(): PlacesProvider {
  const key = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  return key ? new GooglePlacesProvider(key) : new DevPlacesProvider();
}
