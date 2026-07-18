import { apiError, ok } from "@/server/api-util";
import { requireAdminSession } from "@/server/session";
import { compareRates } from "@/server/repo/suppliers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdminSession();
    const url = new URL(req.url);
    const category = url.searchParams.get("category") ?? undefined;
    const city = url.searchParams.get("city") ?? undefined;
    const query = url.searchParams.get("query") ?? undefined;
    return ok({ rates: compareRates({ category, city, query }) });
  } catch (e) {
    return apiError(e);
  }
}
