import { requireSessionProfile } from "@/server/session";
import { apiError, ok, readJson } from "@/server/api-util";
import { tripCreateSchema } from "@/server/schemas";
import { createTrip, listTripsFor } from "@/server/repo/trips";
import { rateLimit } from "@/server/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const me = await requireSessionProfile();
    return ok({ trips: listTripsFor(me.id), profile: me });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const me = await requireSessionProfile();
    rateLimit(`trips:${me.id}`, 20, 3600);
    const input = tripCreateSchema.parse(await readJson(req));
    const trip = createTrip(input, me.id);
    return ok({ trip }, 201);
  } catch (e) {
    return apiError(e);
  }
}
