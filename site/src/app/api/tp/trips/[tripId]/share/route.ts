import { requireSessionProfile } from "@/server/session";
import { apiError, ok, readJson } from "@/server/api-util";
import { requireRole, rateLimit } from "@/server/authz";
import { createInvite, listMembers, removeMember, listActivity } from "@/server/repo/trips";
import { listComments, addComment } from "@/server/repo/misc";
import { inviteCreateSchema } from "@/server/schemas";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tripId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { tripId } = await ctx.params;
    const me = await requireSessionProfile();
    const role = requireRole(tripId, me.id, "viewer");
    return ok({ members: listMembers(tripId), activity: listActivity(tripId, 40), comments: listComments(tripId), role, meId: me.id });
  } catch (e) {
    return apiError(e);
  }
}

const postSchema = z.union([
  z.object({ op: z.literal("invite"), invite: inviteCreateSchema }),
  z.object({ op: z.literal("remove-member"), profileId: z.string().min(6) }),
  z.object({ op: z.literal("comment"), body: z.string().trim().min(1).max(1000), itemId: z.string().nullable().optional() }),
]);

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { tripId } = await ctx.params;
    const me = await requireSessionProfile();
    const body = postSchema.parse(await readJson(req));
    if (body.op === "invite") {
      requireRole(tripId, me.id, "owner");
      rateLimit(`invite:${me.id}`, 20, 3600);
      const inv = createInvite(tripId, body.invite.role, body.invite.email, me.id);
      const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
      return ok({ ...inv, url: `${base}/trips/join?token=${inv.token}` }, 201);
    }
    if (body.op === "remove-member") {
      requireRole(tripId, me.id, "owner");
      removeMember(tripId, body.profileId, me.id);
      return ok({ removed: true });
    }
    requireRole(tripId, me.id, "viewer");
    addComment(tripId, body.body, body.itemId ?? null, me.id);
    return ok({ commented: true }, 201);
  } catch (e) {
    return apiError(e);
  }
}
