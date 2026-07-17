import { apiError, ok } from "@/server/api-util";
import { listPackages } from "@/server/repo/enquiries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const category = new URL(req.url).searchParams.get("category") ?? undefined;
    return ok({ packages: listPackages(category) });
  } catch (e) {
    return apiError(e);
  }
}
