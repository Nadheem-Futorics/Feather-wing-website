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

/**
 * CORS for the public (non-admin) API, so the Flutter mobile app's web build
 * can call it cross-origin. Cookies stay SameSite=Lax, so no credentialed
 * cross-site requests are enabled by this — native mobile clients attach the
 * session cookie themselves and are unaffected by CORS either way.
 */
function withCors(req: NextRequest, res: NextResponse): NextResponse {
  const origin = req.headers.get("origin");
  if (!origin) return res;
  res.headers.set("Access-Control-Allow-Origin", origin);
  res.headers.set("Vary", "Origin");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Accept");
  res.headers.set("Access-Control-Max-Age", "86400");
  return res;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isApi = pathname.startsWith("/api/");
  const isAdminApi = pathname.startsWith("/api/tp/admin");
  if (isApi && !isAdminApi) {
    if (req.method === "OPTIONS") {
      return withCors(req, new NextResponse(null, { status: 204 }));
    }
    return withCors(req, NextResponse.next());
  }

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

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
  matcher: ["/admin/:path*", "/api/:path*"],
};
