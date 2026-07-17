import { requireSessionProfile } from "@/server/session";
import { apiError, ok, readJson } from "@/server/api-util";
import { requireRole } from "@/server/authz";
import { getTrip, patchTrip, softDeleteTrip, listDays, listDestinations, listMembers, listActivity } from "@/server/repo/trips";
import { listItems } from "@/server/repo/items";
import { tripPatchSchema } from "@/server/schemas";
import { listPendingProposals } from "@/server/repo/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tripId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { tripId } = await ctx.params;
    const me = await requireSessionProfile();
    const role = requireRole(tripId, me.id, "viewer");
    return ok({
      trip: getTrip(tripId),
      role,
      days: listDays(tripId),
      destinations: listDestinations(tripId),
      items: listItems(tripId),
      members: listMembers(tripId),
      pendingProposals: listPendingProposals(tripId),
      activity: listActivity(tripId, 20),
      me,
    });
  } catch (e) {
    return apiError(e);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { tripId } = await ctx.params;
    const me = await requireSessionProfile();
    requireRole(tripId, me.id, "editor");
    const patch = tripPatchSchema.parse(await readJson(req));
    return ok({ trip: patchTrip(tripId, patch, me.id) });
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { tripId } = await ctx.params;
    const me = await requireSessionProfile();
    requireRole(tripId, me.id, "owner");
    softDeleteTrip(tripId, me.id);
    return ok({ deleted: true });
  } catch (e) {
    return apiError(e);
  }
}
