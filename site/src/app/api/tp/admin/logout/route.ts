import { ok } from "@/server/api-util";
import { clearAdminSession } from "@/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await clearAdminSession();
  return ok({ loggedOut: true });
}
