/**
 * Routing provider abstraction.
 * Google Routes API adapter activates with GOOGLE_MAPS_SERVER_API_KEY;
 * otherwise a deterministic haversine estimator (labeled "estimated")
 * keeps travel segments and optimization fully functional offline.
 */

export type TravelMode = "walk" | "car" | "taxi" | "public" | "coach";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Leg {
  distanceKm: number;
  durationMin: number;
  mode: TravelMode;
  live: boolean; // true only when a live routing provider returned it
}

export interface RoutingProvider {
  readonly id: string;
  leg(from: LatLng, to: LatLng, mode: TravelMode): Promise<Leg>;
  matrix(points: LatLng[], mode: TravelMode): Promise<number[][]>; // minutes
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const SPEED_KMH: Record<TravelMode, number> = { walk: 4.5, car: 32, taxi: 30, public: 22, coach: 45 };
const OVERHEAD_MIN: Record<TravelMode, number> = { walk: 0, car: 8, taxi: 6, public: 12, coach: 10 };
const CIRCUITY = 1.35; // road distance vs straight line

class EstimatorRoutingProvider implements RoutingProvider {
  readonly id = "estimator";
  async leg(from: LatLng, to: LatLng, mode: TravelMode): Promise<Leg> {
    const straight = haversineKm(from, to);
    const km = straight * CIRCUITY;
    const durationMin = Math.max(2, Math.round((km / SPEED_KMH[mode]) * 60 + (straight > 0.4 ? OVERHEAD_MIN[mode] : 0)));
    return { distanceKm: Math.round(km * 10) / 10, durationMin, mode, live: false };
  }
  async matrix(points: LatLng[], mode: TravelMode): Promise<number[][]> {
    const n = points.length;
    const m: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        m[i][j] = (await this.leg(points[i], points[j], mode)).durationMin;
      }
    return m;
  }
}

class GoogleRoutingProvider implements RoutingProvider {
  readonly id = "google";
  constructor(private key: string, private fallback = new EstimatorRoutingProvider()) {}
  private gMode(mode: TravelMode) {
    return mode === "walk" ? "WALK" : mode === "public" ? "TRANSIT" : "DRIVE";
  }
  async leg(from: LatLng, to: LatLng, mode: TravelMode): Promise<Leg> {
    try {
      const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": this.key,
          "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: from.lat, longitude: from.lng } } },
          destination: { location: { latLng: { latitude: to.lat, longitude: to.lng } } },
          travelMode: this.gMode(mode),
          routingPreference: this.gMode(mode) === "DRIVE" ? "TRAFFIC_AWARE" : undefined,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { routes?: { duration?: string; distanceMeters?: number }[] };
      const r = data.routes?.[0];
      if (!r?.duration) throw new Error("no_route");
      return {
        distanceKm: Math.round(((r.distanceMeters ?? 0) / 1000) * 10) / 10,
        durationMin: Math.max(1, Math.round(parseInt(r.duration, 10) / 60)),
        mode,
        live: true,
      };
    } catch {
      return this.fallback.leg(from, to, mode); // graceful degradation
    }
  }
  async matrix(points: LatLng[], mode: TravelMode): Promise<number[][]> {
    // Route Matrix batching could go here; estimator keeps costs bounded for now.
    return new EstimatorRoutingProvider().matrix(points, mode);
  }
}

export function routingProvider(): RoutingProvider {
  const key = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  return key ? new GoogleRoutingProvider(key) : new EstimatorRoutingProvider();
}

/* ── Weather (dev stub unless WEATHER_API_KEY is configured) ── */

export interface DayForecast {
  date: string;
  summary: string;
  highC: number;
  lowC: number;
  precipitationChance: number;
  live: boolean;
}

export async function weatherForecast(lat: number, lng: number, dates: string[]): Promise<DayForecast[]> {
  if (process.env.WEATHER_API_KEY) {
    // Live provider adapter goes here when a key is configured.
  }
  // Deterministic development data — labeled, never presented as live.
  return dates.map((date, i) => ({
    date,
    summary: ["Sunny", "Partly cloudy", "Clear", "Light breeze"][i % 4],
    highC: 24 + ((i * 3 + Math.round(Math.abs(lat)) ) % 8),
    lowC: 15 + ((i * 2) % 6),
    precipitationChance: [5, 10, 0, 20][i % 4],
    live: false,
  }));
}
