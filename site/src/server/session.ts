import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db, nowIso, uid } from "./db";
import { HttpError } from "./authz";

/**
 * Guest-session authentication.
 * The site has no pre-existing auth provider, so the planner uses signed
 * device sessions: a profile row + HMAC-signed cookie. Every mutation is
 * authorized against trip membership. The interface (getSessionProfile)
 * is the seam where Supabase Auth or any other provider can be swapped in.
 */

const COOKIE = "fwt_session";

function secret(): string {
  // Dev fallback keeps the app runnable; set SESSION_SECRET in production.
  return process.env.SESSION_SECRET ?? "fwt-dev-session-secret-change-me";
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function verify(value: string, sig: string): boolean {
  const expected = sign(value);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface SessionProfile {
  id: string;
  displayName: string;
  email: string | null;
  isAdmin: boolean;
}

/** Read the current session; returns null when absent/invalid. */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  const [id, sig] = raw.split(".");
  if (!id || !sig || !verify(id, sig)) return null;
  const row = db()
    .prepare("SELECT id, display_name, email, is_admin FROM profiles WHERE id = ?")
    .get(id) as { id: string; display_name: string; email: string | null; is_admin: number } | undefined;
  if (!row) return null;
  return { id: row.id, displayName: row.display_name, email: row.email, isAdmin: !!row.is_admin };
}

/** Get the session, creating a profile + cookie when missing (route handlers only). */
export async function requireSessionProfile(): Promise<SessionProfile> {
  const existing = await getSessionProfile();
  if (existing) return existing;
  const id = uid();
  const now = nowIso();
  db()
    .prepare("INSERT INTO profiles (id, display_name, locale, created_at, updated_at) VALUES (?, 'Traveller', 'en', ?, ?)")
    .run(id, now, now);
  const jar = await cookies();
  jar.set(COOKIE, `${id}.${sign(id)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_APP_URL?.startsWith("https"),
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return { id, displayName: "Traveller", email: null, isAdmin: false };
}

export function updateProfile(id: string, patch: { displayName?: string; email?: string | null; locale?: string }) {
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (patch.displayName !== undefined) {
    sets.push("display_name = ?");
    vals.push(patch.displayName);
  }
  if (patch.email !== undefined) {
    sets.push("email = ?");
    vals.push(patch.email);
  }
  if (patch.locale !== undefined) {
    sets.push("locale = ?");
    vals.push(patch.locale);
  }
  if (!sets.length) return;
  sets.push("updated_at = ?");
  vals.push(nowIso(), id);
  db().prepare(`UPDATE profiles SET ${sets.join(", ")} WHERE id = ?`).run(...(vals as never[]));
}

/**
 * Admin portal session — real username/password login (src/app/admin/login),
 * backed by the admin_users table (src/server/repo/admin-users.ts). The
 * cookie is a signed, self-contained token (id.username.iat.sig) so it can
 * be verified without a DB round-trip — safe to check in proxy.ts on every
 * admin request.
 */

const ADMIN_COOKIE = "fwt_admin_session";
const ADMIN_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AdminSession {
  id: string;
  username: string;
}

function verifyAdminToken(raw: string | undefined): AdminSession | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 4) return null;
  const [id, username, iatStr, sig] = parts;
  if (!verify(`${id}.${username}.${iatStr}`, sig)) return null;
  const iat = Number(iatStr);
  if (!Number.isFinite(iat) || Date.now() - iat > ADMIN_SESSION_TTL_MS) return null;
  return { id, username: decodeURIComponent(username) };
}

/** Read the current admin session; returns null when absent/invalid/expired. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  return verifyAdminToken(jar.get(ADMIN_COOKIE)?.value);
}

/** Same as getAdminSession but throws 401 — use at the top of admin API route handlers. */
export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new HttpError(401, "unauthorized", "Admin login required.");
  return session;
}

export async function grantAdminSession(id: string, username: string): Promise<void> {
  const jar = await cookies();
  const iat = Date.now();
  const encodedUsername = encodeURIComponent(username);
  const payload = `${id}.${encodedUsername}.${iat}`;
  jar.set(ADMIN_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_APP_URL?.startsWith("https"),
    maxAge: ADMIN_SESSION_TTL_MS / 1000,
    path: "/",
  });
}

export async function clearAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}
