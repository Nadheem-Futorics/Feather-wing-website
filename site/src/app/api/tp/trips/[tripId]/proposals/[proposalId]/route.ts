import { requireSessionProfile } from "@/server/session";
import { apiError, ok, readJson } from "@/server/api-util";
import { requireRole, logActivity, HttpError } from "@/server/authz";
import { getProposal, resolveProposal } from "@/server/repo/ai";
import { applyChangeSet, revertChangeSet } from "@/server/repo/items";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tripId: string; proposalId: string }> };
const bodySchema = z.object({ action: z.enum(["apply", "reject", "undo"]) });

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { tripId, proposalId } = await ctx.params;
    const me = await requireSessionProfile();
    requireRole(tripId, me.id, "viewer");
    return ok({ proposal: getProposal(tripId, proposalId) });
  } catch (e) {
    return apiError(e);
  }
}

/** User-approved commit path — the only place AI change sets touch the itinerary. */
export async function POST(req: Request, ctx: Ctx) {
  try {
    const { tripId, proposalId } = await ctx.params;
    const me = await requireSessionProfile();
    requireRole(tripId, me.id, "editor");
    const { action } = bodySchema.parse(await readJson(req));
    const proposal = getProposal(tripId, proposalId);

    if (action === "apply") {
      if (proposal.status !== "pending") throw new HttpError(409, "already_resolved", "This preview was already handled.");
      const { undo } = applyChangeSet(tripId, proposal.changes, me.id);
      resolveProposal(tripId, proposalId, "applied", undo);
      logActivity(tripId, me.id, "proposal.applied", proposalId, { summary: proposal.summary });
      return ok({ applied: true });
    }
    if (action === "reject") {
      if (proposal.status !== "pending") throw new HttpError(409, "already_resolved");
      resolveProposal(tripId, proposalId, "rejected");
      logActivity(tripId, me.id, "proposal.rejected", proposalId);
      return ok({ rejected: true });
    }
    // undo
    if (proposal.status !== "applied" || !proposal.undoSnapshot) throw new HttpError(409, "nothing_to_undo");
    revertChangeSet(tripId, proposal.undoSnapshot as { rows: unknown[]; createdIds: string[] }, me.id);
    resolveProposal(tripId, proposalId, "undone");
    return ok({ undone: true });
  } catch (e) {
    return apiError(e);
  }
}
