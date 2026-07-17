import { requireSessionProfile, updateProfile } from "@/server/session";
import { apiError, ok, readJson } from "@/server/api-util";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ displayName: z.string().trim().min(1).max(60).optional(), email: z.string().email().max(200).nullable().optional() });

export async function GET() {
  try {
    return ok({ profile: await requireSessionProfile() });
  } catch (e) {
    return apiError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const me = await requireSessionProfile();
    const patch = schema.parse(await readJson(req));
    updateProfile(me.id, patch);
    return ok({ updated: true });
  } catch (e) {
    return apiError(e);
  }
}
