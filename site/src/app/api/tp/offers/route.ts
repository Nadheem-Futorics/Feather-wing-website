import { apiError, ok } from "@/server/api-util";
import { listOffers } from "@/server/repo/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok({ offers: listOffers() });
  } catch (e) {
    return apiError(e);
  }
}
