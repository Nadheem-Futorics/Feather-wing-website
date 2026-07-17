import { requireSessionProfile } from "@/server/session";
import { apiError, ok, readJson } from "@/server/api-util";
import { requireRole } from "@/server/authz";
import { patchItem, deleteItem, undeleteItem, duplicateItem } from "@/server/repo/items";
import { itemPatchSchema } from "@/server/schemas";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tripId: string; itemId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { tripId, itemId } = await ctx.params;
    const me = await requireSessionProfile();
    requireRole(tripId, me.id, "editor");
    const patch = itemPatchSchema.parse(await readJson(req));
    return ok({ item: patchItem(tripId, itemId, patch, me.id) });
  } catch (e) {
    return apiError(e);
  }
}

const actionSchema = z.object({ action: z.enum(["duplicate", "restore"]) });

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { tripId, itemId } = await ctx.params;
    const me = await requireSessionProfile();
    requireRole(tripId, me.id, "editor");
    const { action } = actionSchema.parse(await readJson(req));
    if (action === "duplicate") return ok({ item: duplicateItem(tripId, itemId, me.id) }, 201);
    return ok({ item: undeleteItem(tripId, itemId, me.id) });
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { tripId, itemId } = await ctx.params;
    const me = await requireSessionProfile();
    requireRole(tripId, me.id, "editor");
    return ok(deleteItem(tripId, itemId, me.id));
  } catch (e) {
    return apiError(e);
  }
}
