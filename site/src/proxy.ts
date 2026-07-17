import { NextResponse, type NextRequest } from "next/server";
import { getAdminSession } from "@/server/session";

/**
 * Gates the admin portal (Next.js 16 renamed `middleware` to `proxy`; the
 * runtime is always Node.js here, so this can safely reuse the same signed
 * cookie verification as the API routes — see src/server/session.ts).
 * Login itself must stay reachable, everything else under /admin and
 * /api/tp/admin requires a valid session.
 */

const PUBLIC_PATHS = new Set(["/admin/login", "/api/tp/admin/login"]);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const isAdminApi = pathname.startsWith("/api/tp/admin");
  const isAdminPage = pathname.startsWith("/admin");
  if (!isAdminApi && !isAdminPage) return NextResponse.next();

  const session = await getAdminSession();
  if (session) return NextResponse.next();

  if (isAdminApi) {
    return NextResponse.json({ ok: false, error: "unauthorized", message: "Admin login required." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/tp/admin/:path*"],
};
