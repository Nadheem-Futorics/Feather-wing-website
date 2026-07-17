import { apiError, ok, readJson } from "@/server/api-util";
import { requireAdminSession } from "@/server/session";
import { meetingPatchSchema } from "@/server/schemas";
import { updateMeeting, deleteMeeting } from "@/server/repo/meetings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    await requireAdminSession();
    const { id } = await ctx.params;
    const input = meetingPatchSchema.parse(await readJson(req));
    const meeting = await updateMeeting(id, input);
    return ok({ meeting });
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    await requireAdminSession();
    const { id } = await ctx.params;
    await deleteMeeting(id);
    return ok({ deleted: true });
  } catch (e) {
    return apiError(e);
  }
}
