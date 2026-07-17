import { apiError, ok, readJson } from "@/server/api-util";
import { HttpError } from "@/server/authz";
import { requireAdminSession } from "@/server/session";
import { changeAdminPassword } from "@/server/repo/admin-users";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});

export async function PATCH(req: Request) {
  try {
    const session = await requireAdminSession();
    const { currentPassword, newPassword } = patchSchema.parse(await readJson(req));
    const changed = changeAdminPassword(session.id, currentPassword, newPassword);
    if (!changed) throw new HttpError(401, "invalid_credentials", "Current password is incorrect.");
    return ok({ changed: true });
  } catch (e) {
    return apiError(e);
  }
}
