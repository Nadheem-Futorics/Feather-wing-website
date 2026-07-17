import type { LatLng, TravelMode } from "./providers/routing";
import { haversineKm } from "./providers/routing";

/**
 * Deterministic itinerary optimizer (no LLM involvement).
 * Pipeline: constraint validation → geographic clustering (nearest-
 * neighbour greedy) → local 2-opt improvement → sequential time-window
 * scheduling with meal breaks → overflow detection.
 * Pure functions; replaceable later by a real solver.
 */

export interface OptItem {
  id: string;
  name: string;
  category: string;
  lat: number | null;
  lng: number | null;
  durationMin: number | null;
  startTime: string | null; // fixed appointment when set
  locked: boolean;
  priority: "must" | "normal" | "low";
}

export interface OptOptions {
  dayStart: string; // HH:MM
  dayEnd: string;
  pace: "relaxed" | "balanced" | "packed";
  mode: TravelMode;
  origin?: LatLng | null; // accommodation
  legMinutes: (a: LatLng, b: LatLng) => number;
}

export interface ScheduledStop {
  itemId: string;
  start: string;
  end: string;
  travelBeforeMin: number;
  kind: "activity" | "meal-break";
}

export interface OptimizeResult {
  feasible: boolean;
  order: string[];
  schedule: ScheduledStop[];
  overflow: { itemId: string; reason: string }[];
  conflicts: string[];
  explanations: string[];
  totalTravelMin: number;
}

const DEFAULT_DURATION: Record<string, number> = {
  attraction: 90, museum: 120, park: 60, beach: 150, nature: 120, shopping: 90, restaurant: 75, cafe: 40,
  hotel: 30, entertainment: 120, family: 120, religious: 60, package: 240, activity: 90, custom: 60, transport: 30,
};

const OPENING: Record<string, [number, number]> = {
  museum: [9 * 60, 18 * 60], shopping: [10 * 60, 22 * 60], restaurant: [11 * 60, 24 * 60],
  cafe: [8 * 60, 23 * 60], park: [6 * 60, 22 * 60], entertainment: [10 * 60, 24 * 60],
};

const PACE = {
  relaxed: { durationX: 1.25, maxStops: 4, buffer: 20 },
  balanced: { durationX: 1.0, maxStops: 6, buffer: 10 },
  packed: { durationX: 0.9, maxStops: 8, buffer: 5 },
} as const;

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
export const toHHMM = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

function durationOf(item: OptItem, pace: keyof typeof PACE): number {
  const base = item.durationMin ?? DEFAULT_DURATION[item.category] ?? 60;
  return Math.round(base * PACE[pace].durationX);
}

function pos(item: OptItem): LatLng | null {
  return item.lat != null && item.lng != null ? { lat: item.lat, lng: item.lng } : null;
}

/** Nearest-neighbour ordering from an origin, then a single 2-opt pass. */
export function clusterOrder(items: OptItem[], origin: LatLng | null): OptItem[] {
  const located = items.filter((i) => pos(i));
  const floating = items.filter((i) => !pos(i));
  if (located.length <= 1) return [...located, ...floating];

  const start =
    origin ??
    ({
      lat: located.reduce((s, i) => s + (i.lat as number), 0) / located.length,
      lng: located.reduce((s, i) => s + (i.lng as number), 0) / located.length,
    } as LatLng);

  const remaining = [...located];
  const route: OptItem[] = [];
  let cur = start;
  while (remaining.length) {
    let bi = 0;
    let bd = Infinity;
    remaining.forEach((it, idx) => {
      const d = haversineKm(cur, pos(it)!);
      if (d < bd) {
        bd = d;
        bi = idx;
      }
    });
    const next = remaining.splice(bi, 1)[0];
    route.push(next);
    cur = pos(next)!;
  }

  // 2-opt improvement
  const dist = (a: OptItem, b: OptItem) => haversineKm(pos(a)!, pos(b)!);
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 30) {
    improved = false;
    for (let i = 0; i < route.length - 2; i++) {
      for (let j = i + 2; j < route.length - 1; j++) {
        const delta = dist(route[i], route[j]) + dist(route[i + 1], route[j + 1]) - dist(route[i], route[i + 1]) - dist(route[j], route[j + 1]);
        if (delta < -0.05) {
          route.splice(i + 1, j - i, ...route.slice(i + 1, j + 1).reverse());
          improved = true;
        }
      }
    }
  }
  return [...route, ...floating];
}

export function optimizeDay(items: OptItem[], opts: OptOptions): OptimizeResult {
  const explanations: string[] = [];
  const conflicts: string[] = [];
  const pace = PACE[opts.pace];
  const dayStart = toMin(opts.dayStart);
  const dayEnd = toMin(opts.dayEnd);

  if (dayEnd <= dayStart) {
    return { feasible: false, order: items.map((i) => i.id), schedule: [], overflow: [], conflicts: ["Day end time is before day start time."], explanations, totalTravelMin: 0 };
  }

  // 1) Anchors: fixed appointments and locked items keep their times/positions.
  const anchors = items
    .filter((i) => i.locked || i.startTime)
    .sort((a, b) => toMin(a.startTime ?? opts.dayStart) - toMin(b.startTime ?? opts.dayStart));
  const flexible = items.filter((i) => !anchors.includes(i));

  // 2) Geographic ordering of flexible items.
  const routed = clusterOrder(flexible, opts.origin ?? null);

  // 3) Merge: walk time forward, inserting anchors at their fixed times.
  const schedule: ScheduledStop[] = [];
  const overflow: { itemId: string; reason: string }[] = [];
  let t = dayStart;
  let cursor: LatLng | null = opts.origin ?? null;
  let travelTotal = 0;
  let lunchDone = false;
  const queueAnchors = [...anchors];
  const queueFlex = [...routed];
  const order: string[] = [];

  const placeStop = (item: OptItem, fixedStart: number | null): boolean => {
    const p = pos(item);
    let travel = 0;
    if (p && cursor) travel = opts.legMinutes(cursor, p);
    let start = t + travel + (schedule.length ? pace.buffer : 0);
    if (fixedStart != null) {
      if (start > fixedStart + 10) {
        conflicts.push(`"${item.name}" starts at ${toHHMM(fixedStart)} but the earliest arrival is ${toHHMM(start)}.`);
      }
      start = Math.max(start, fixedStart);
    }
    const open = OPENING[item.category];
    if (open && start < open[0]) {
      start = open[0];
      explanations.push(`Shifted "${item.name}" to its opening time (${toHHMM(open[0])}).`);
    }
    const dur = durationOf(item, opts.pace);
    const end = start + dur;
    if (open && end > open[1]) conflicts.push(`"${item.name}" may end after closing time (${toHHMM(open[1])}).`);
    if (end > dayEnd) {
      if (item.locked || fixedStart != null) {
        conflicts.push(`Fixed item "${item.name}" does not fit before your day ends at ${opts.dayEnd}.`);
      } else {
        overflow.push({ itemId: item.id, reason: `No time left before ${opts.dayEnd}` });
        return false;
      }
    }
    schedule.push({ itemId: item.id, start: toHHMM(start), end: toHHMM(Math.min(end, dayEnd)), travelBeforeMin: travel, kind: "activity" });
    order.push(item.id);
    travelTotal += travel;
    t = end;
    if (p) cursor = p;
    return true;
  };

  const maybeLunch = () => {
    if (lunchDone || opts.pace === "packed") return;
    if (t >= 12 * 60 + 30 && t <= 14 * 60 + 30) {
      const hasRestaurantSoon = queueFlex.slice(0, 2).some((i) => i.category === "restaurant") || queueAnchors.slice(0, 1).some((i) => i.category === "restaurant");
      if (!hasRestaurantSoon) {
        schedule.push({ itemId: "meal-lunch", start: toHHMM(t), end: toHHMM(t + 45), travelBeforeMin: 0, kind: "meal-break" });
        explanations.push("Added a 45-minute lunch break.");
        t += 45;
      }
      lunchDone = true;
    }
  };

  let stops = 0;
  while (queueAnchors.length || queueFlex.length) {
    maybeLunch();
    const nextAnchor = queueAnchors[0];
    const nextAnchorStart = nextAnchor ? toMin(nextAnchor.startTime ?? opts.dayStart) : Infinity;

    if (nextAnchor && (queueFlex.length === 0 || nextAnchorStart <= t + 30)) {
      queueAnchors.shift();
      placeStop(nextAnchor, nextAnchor.startTime ? nextAnchorStart : null);
      stops++;
      continue;
    }

    const flex = queueFlex.shift();
    if (!flex) continue;
    if (stops >= pace.maxStops && flex.priority !== "must") {
      overflow.push({ itemId: flex.id, reason: `Exceeds a ${opts.pace} pace (${pace.maxStops} stops/day)` });
      explanations.push(`Suggested moving "${flex.name}" to another day to respect your ${opts.pace} pace.`);
      continue;
    }
    // Would this flexible stop collide with the next fixed anchor? Push it to overflow instead of delaying the anchor.
    const p = pos(flex);
    const travel = p && cursor ? opts.legMinutes(cursor, p) : 0;
    const projectedEnd = t + travel + durationOf(flex, opts.pace);
    if (nextAnchor && nextAnchor.startTime && projectedEnd > nextAnchorStart - 5 && flex.priority !== "must") {
      overflow.push({ itemId: flex.id, reason: `Would clash with "${nextAnchor.name}" at ${nextAnchor.startTime}` });
      continue;
    }
    if (placeStop(flex, null)) stops++;
  }

  const feasible = conflicts.length === 0;
  if (overflow.length) explanations.push(`${overflow.length} activit${overflow.length === 1 ? "y" : "ies"} did not fit and can move to another day.`);
  if (travelTotal > 0) explanations.push(`Estimated total travel: ${travelTotal} minutes.`);

  return { feasible, order, schedule, overflow, conflicts, explanations, totalTravelMin: travelTotal };
}
