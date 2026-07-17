import { apiError, ok } from "@/server/api-util";
import { listFeaturedTrips } from "@/server/repo/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok({ trips: listFeaturedTrips() });
  } catch (e) {
    return apiError(e);
  }
}
