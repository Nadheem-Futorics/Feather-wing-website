import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Isolated database per test run.
process.env.TP_DATA_DIR = mkdtempSync(join(tmpdir(), "fwt-tp-"));

import { tripCreateSchema, changeSetSchema, quoteCreateSchema } from "../schemas";
import { optimizeDay, clusterOrder, toMin, type OptItem } from "../optimizer";
import { splitEqually } from "../repo/misc";
import { createTrip, getTrip, listDays } from "../repo/trips";
import { createItem, listItems, applyChangeSet, revertChangeSet, deleteItem, undeleteItem } from "../repo/items";
import { requireRole, addMember, HttpError } from "../authz";
import { db, nowIso, uid } from "../db";

function makeProfile(): string {
  const id = uid();
  db().prepare("INSERT INTO profiles (id, display_name, locale, created_at, updated_at) VALUES (?, 'Test', 'en', ?, ?)").run(id, nowIso(), nowIso());
  return id;
}

describe("trip creation validation (Zod)", () => {
  it("rejects a trip without destinations", () => {
    expect(tripCreateSchema.safeParse({ name: "My Trip", destinations: [] }).success).toBe(false);
  });
  it("rejects end date before start date", () => {
    const r = tripCreateSchema.safeParse({ name: "My Trip", destinations: [{ name: "Istanbul" }], startDate: "2026-09-10", endDate: "2026-09-01" });
    expect(r.success).toBe(false);
  });
  it("accepts a minimal valid trip and applies defaults", () => {
    const r = tripCreateSchema.parse({ name: "Family Istanbul", destinations: [{ name: "Istanbul" }] });
    expect(r.currency).toBe("SAR");
    expect(r.pace).toBe("balanced");
  });
  it("validates quote enquiry email", () => {
    expect(quoteCreateSchema.safeParse({ customerName: "Ali", email: "not-an-email" }).success).toBe(false);
  });
});

describe("access permissions", () => {
  it("denies non-members with 404 and enforces roles", () => {
    const owner = makeProfile();
    const stranger = makeProfile();
    const viewer = makeProfile();
    const trip = createTrip(tripCreateSchema.parse({ name: "Secure", destinations: [{ name: "Riyadh" }] }), owner);

    expect(() => requireRole(trip.id, stranger, "viewer")).toThrowError(HttpError);
    expect(requireRole(trip.id, owner, "owner")).toBe("owner");

    addMember(trip.id, viewer, "viewer");
    expect(requireRole(trip.id, viewer, "viewer")).toBe("viewer");
    expect(() => requireRole(trip.id, viewer, "editor")).toThrowError(HttpError);
  });
});

describe("itinerary CRUD + undo", () => {
  it("creates, soft-deletes and restores items", () => {
    const owner = makeProfile();
    const trip = createTrip(tripCreateSchema.parse({ name: "CRUD", destinations: [{ name: "Jeddah" }], startDate: "2026-10-01", endDate: "2026-10-03" }), owner);
    const day = listDays(trip.id)[0];
    const item = createItem(trip.id, { name: "Corniche walk", category: "park", dayId: day.id, priority: "normal", locked: false, source: "manual" }, owner);
    expect(listItems(trip.id)).toHaveLength(1);
    deleteItem(trip.id, item.id, owner);
    expect(listItems(trip.id)).toHaveLength(0);
    undeleteItem(trip.id, item.id, owner);
    expect(listItems(trip.id)).toHaveLength(1);
  });

  it("changesets preserve locked items and support undo", () => {
    const owner = makeProfile();
    const trip = createTrip(tripCreateSchema.parse({ name: "Locks", destinations: [{ name: "Istanbul" }], startDate: "2026-10-01", endDate: "2026-10-02" }), owner);
    const day = listDays(trip.id)[0];
    const lockedItem = createItem(trip.id, { name: "Fixed dinner", category: "restaurant", dayId: day.id, locked: true, priority: "must", source: "manual" }, owner);

    const removal = changeSetSchema.parse({ removes: [{ itemId: lockedItem.id }] });
    expect(() => applyChangeSet(trip.id, removal, owner)).toThrowError(/locked/i);

    const adds = changeSetSchema.parse({ adds: [{ name: "Hagia Sophia", category: "religious", dayIndex: 0 }] });
    const { undo } = applyChangeSet(trip.id, adds, owner);
    expect(listItems(trip.id)).toHaveLength(2);
    revertChangeSet(trip.id, undo, owner);
    expect(listItems(trip.id).map((i) => i.name)).toEqual(["Fixed dinner"]);
  });
});

describe("route optimization", () => {
  const leg = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
    Math.max(2, Math.round(Math.hypot(a.lat - b.lat, a.lng - b.lng) * 111 * 2));
  const base = { dayStart: "09:00", dayEnd: "21:00", pace: "balanced" as const, mode: "car" as const, origin: null, legMinutes: leg };

  const item = (o: Partial<OptItem>): OptItem => ({
    id: o.id ?? uid(), name: o.name ?? "X", category: o.category ?? "attraction", lat: o.lat ?? null, lng: o.lng ?? null,
    durationMin: o.durationMin ?? 60, startTime: o.startTime ?? null, locked: o.locked ?? false, priority: o.priority ?? "normal",
  });

  it("orders geographically (nearest neighbour + 2-opt)", () => {
    const a = item({ id: "a", lat: 41.0, lng: 29.0 });
    const b = item({ id: "b", lat: 41.5, lng: 29.5 });
    const c = item({ id: "c", lat: 41.05, lng: 29.05 });
    const order = clusterOrder([a, b, c], { lat: 41.0, lng: 29.0 }).map((x) => x.id);
    expect(order).toEqual(["a", "c", "b"]);
  });

  it("respects fixed appointments and reports conflicts for impossible windows", () => {
    const fixed = item({ id: "f", name: "Show", startTime: "10:00", durationMin: 60, lat: 41, lng: 29 });
    const early = item({ id: "e", name: "Big museum", durationMin: 600, lat: 41.01, lng: 29.01, priority: "must" });
    const res = optimizeDay([fixed, early], base);
    // The must-visit museum cannot both run 10h and let the show start on time.
    expect(res.conflicts.length).toBeGreaterThan(0);
  });

  it("moves overflow to another day instead of silently dropping", () => {
    const items = Array.from({ length: 9 }, (_, i) => item({ id: `i${i}`, lat: 41 + i * 0.01, lng: 29, durationMin: 120 }));
    const res = optimizeDay(items, base);
    expect(res.overflow.length).toBeGreaterThan(0);
    expect(res.order.length + res.overflow.length).toBe(items.length); // nothing lost
  });

  it("keeps a normal day feasible within the time window", () => {
    const items = [
      item({ id: "m", category: "museum", lat: 41.008, lng: 28.98 }),
      item({ id: "r", category: "restaurant", lat: 41.01, lng: 28.97 }),
      item({ id: "p", category: "park", lat: 41.013, lng: 28.981 }),
    ];
    const res = optimizeDay(items, base);
    expect(res.feasible).toBe(true);
    const last = res.schedule.filter((s) => s.kind === "activity").at(-1)!;
    expect(toMin(last.end)).toBeLessThanOrEqual(toMin("21:00"));
  });
});

describe("expense splitting", () => {
  it("splits equally and conserves the total to the cent", () => {
    const shares = splitEqually(100, ["a", "b", "c"]);
    expect(shares.reduce((s, x) => s + x.share, 0)).toBeCloseTo(100, 2);
    expect(Math.max(...shares.map((s) => s.share)) - Math.min(...shares.map((s) => s.share))).toBeLessThanOrEqual(0.01 + 1e-9);
  });
});

describe("trip bootstrap", () => {
  it("creates day rows across the date range", () => {
    const owner = makeProfile();
    const trip = createTrip(tripCreateSchema.parse({ name: "Days", destinations: [{ name: "London" }], startDate: "2026-11-01", endDate: "2026-11-05" }), owner);
    expect(listDays(trip.id)).toHaveLength(5);
    expect(getTrip(trip.id).currency).toBe("SAR");
  });
});
