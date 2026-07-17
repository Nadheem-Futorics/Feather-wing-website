import { requireSessionProfile } from "@/server/session";
import { apiError, ok, readJson } from "@/server/api-util";
import { requireRole } from "@/server/authz";
import { createItem, reorderItems } from "@/server/repo/items";
import { itemCreateSchema, reorderSchema } from "@/server/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tripId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { tripId } = await ctx.params;
    const me = await requireSessionProfile();
    requireRole(tripId, me.id, "editor");
    const body = (await readJson(req)) as { reorder?: unknown } & Record<string, unknown>;
    if (body.reorder) {
      const r = reorderSchema.parse(body.reorder);
      reorderItems(tripId, r.dayId, r.orderedItemIds, me.id);
      return ok({ reordered: true });
    }
    const input = itemCreateSchema.parse(body);
    return ok({ item: createItem(tripId, input, me.id) }, 201);
  } catch (e) {
    return apiError(e);
  }
}
