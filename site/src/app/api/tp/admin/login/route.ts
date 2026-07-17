import { apiError, ok, readJson } from "@/server/api-util";
import { rateLimit, HttpError } from "@/server/authz";
import { verifyAdminCredentials } from "@/server/repo/admin-users";
import { grantAdminSession } from "@/server/session";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    rateLimit(`admin-login:${ip}`, 10, 15 * 60);
    const { username, password } = loginSchema.parse(await readJson(req));
    const user = verifyAdminCredentials(username, password);
    if (!user) throw new HttpError(401, "invalid_credentials", "Invalid username or password.");
    await grantAdminSession(user.id, user.username);
    return ok({ username: user.username });
  } catch (e) {
    return apiError(e);
  }
}
