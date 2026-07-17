import { requireSessionProfile } from "@/server/session";
import { apiError, ok } from "@/server/api-util";
import { requireRole, rateLimit } from "@/server/authz";
import { listItems } from "@/server/repo/items";
import { routingProvider, type TravelMode } from "@/server/providers/routing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tripId: string }> };

/** Travel segments between consecutive located items of one day. */
export async function GET(req: Request, ctx: Ctx) {
  try {
    const { tripId } = await ctx.params;
    const me = await requireSessionProfile();
    requireRole(tripId, me.id, "viewer");
    rateLimit(`segments:${me.id}`, 120, 3600);
    const url = new URL(req.url);
    const dayId = url.searchParams.get("dayId");
    const mode = (url.searchParams.get("mode") ?? "car") as TravelMode;
    const items = listItems(tripId)
      .filter((i) => i.dayId === dayId && i.lat != null && i.lng != null)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const routing = routingProvider();
    const segments = [];
    for (let i = 0; i < items.length - 1; i++) {
      const leg = await routing.leg(
        { lat: items[i].lat!, lng: items[i].lng! },
        { lat: items[i + 1].lat!, lng: items[i + 1].lng! },
        mode
      );
      segments.push({ fromItemId: items[i].id, toItemId: items[i + 1].id, ...leg });
    }
    return ok({ segments, live: routing.id === "google", source: routing.id === "google" ? "Google Routes" : "Estimated" });
  } catch (e) {
    return apiError(e);
  }
}
