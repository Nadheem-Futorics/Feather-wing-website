import { apiError, ok } from "@/server/api-util";
import { requireAdminSession } from "@/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireAdminSession();
    return ok({ username: session.username });
  } catch (e) {
    return apiError(e);
  }
}
