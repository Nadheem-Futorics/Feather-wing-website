import { apiError, ok } from "@/server/api-util";
import { listDestinationCards } from "@/server/repo/destinationCards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok({ destinations: listDestinationCards(false) });
  } catch (e) {
    return apiError(e);
  }
}
