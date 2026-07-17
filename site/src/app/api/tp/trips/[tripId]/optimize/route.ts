import { requireSessionProfile } from "@/server/session";
import { apiError, ok, readJson } from "@/server/api-util";
import { requireRole, rateLimit } from "@/server/authz";
import { getTrip, listDays } from "@/server/repo/trips";
import { listItems } from "@/server/repo/items";
import { optimizeDay, type OptItem } from "@/server/optimizer";
import { routingProvider, haversineKm } from "@/server/providers/routing";
import { createProposal } from "@/server/repo/ai";
import { z } from "zod";
import type { ChangeSet } from "@/server/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tripId: string }> };
const bodySchema = z.object({ dayId: z.string().min(6), mode: z.enum(["walk", "car", "taxi", "public", "coach"]).default("car") });

/** Deterministic optimization → change proposal (previewed, undoable). */
export async function POST(req: Request, ctx: Ctx) {
  try {
    const { tripId } = await ctx.params;
    const me = await requireSessionProfile();
    requireRole(tripId, me.id, "editor");
    rateLimit(`optimize:${me.id}`, 60, 3600);
    const { dayId, mode } = bodySchema.parse(await readJson(req));
    const trip = getTrip(tripId);
    const day = listDays(tripId).find((d) => d.id === dayId);
    if (!day) return apiError(new Error("day"));

    const items = listItems(tripId).filter((i) => i.dayId === dayId);
    const optItems: OptItem[] = items.map((i) => ({
      id: i.id, name: i.name, category: i.category, lat: i.lat, lng: i.lng, durationMin: i.durationMin,
      startTime: i.startTime, locked: i.locked, priority: i.priority,
    }));
    void routingProvider(); // live matrix hook; estimator keeps preview instant
    const result = optimizeDay(optItems, {
      dayStart: trip.dayStart, dayEnd: trip.dayEnd, pace: trip.pace, mode, origin: null,
      legMinutes: (a, b) => Math.max(2, Math.round(((haversineKm(a, b) * 1.35) / 30) * 60)),
    });

    // Build a change set: reorder via updates (sort), overflow via moves to next day.
    const days = listDays(tripId);
    const nextDay = days.find((d) => d.dayIndex === day.dayIndex + 1);
    const changes: ChangeSet = { adds: [], removes: [], moves: [], updates: [] };
    result.order.forEach((itemId, idx) => {
      const sched = result.schedule.find((s) => s.itemId === itemId);
      changes.updates.push({ itemId, patch: { startTime: sched?.start ?? null } as never });
      void idx;
    });
    if (nextDay) for (const o of result.overflow) changes.moves.push({ itemId: o.itemId, toDayIndex: nextDay.dayIndex });

    const summary = result.feasible
      ? `Optimized day ${day.dayIndex + 1}: ${result.order.length} stops, ~${result.totalTravelMin} min travel${result.overflow.length ? `, ${result.overflow.length} moved to the next day` : ""}.`
      : `Day ${day.dayIndex + 1} has conflicts — proposed a feasible arrangement.`;
    const proposalId = createProposal(tripId, null, summary, changes, {
      order: result.order, schedule: result.schedule, conflicts: result.conflicts, explanations: result.explanations,
      overflow: result.overflow, totalTravelMin: result.totalTravelMin, feasible: result.feasible,
    }, me.id);

    return ok({ proposalId, result });
  } catch (e) {
    return apiError(e);
  }
}
