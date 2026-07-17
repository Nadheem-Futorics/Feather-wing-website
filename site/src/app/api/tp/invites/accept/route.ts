import { requireSessionProfile } from "@/server/session";
import { apiError, ok, readJson } from "@/server/api-util";
import { acceptInvite } from "@/server/repo/trips";
import { rateLimit } from "@/server/authz";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ token: z.string().min(20).max(120) });

export async function POST(req: Request) {
  try {
    const me = await requireSessionProfile();
    rateLimit(`invite-accept:${me.id}`, 20, 3600);
    const { token } = schema.parse(await readJson(req));
    return ok(acceptInvite(token, me.id));
  } catch (e) {
    return apiError(e);
  }
}
