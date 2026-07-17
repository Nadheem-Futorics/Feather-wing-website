import { db, nowIso, uid } from "./db";

export type TripRole = "owner" | "editor" | "viewer";

const RANK: Record<TripRole, number> = { viewer: 0, editor: 1, owner: 2 };

export class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message?: string) {
    super(message ?? code);
    this.status = status;
    this.code = code;
  }
}

export function roleFor(tripId: string, profileId: string): TripRole | null {
  const row = db()
    .prepare("SELECT role FROM trip_members WHERE trip_id = ? AND profile_id = ?")
    .get(tripId, profileId) as { role: TripRole } | undefined;
  return row?.role ?? null;
}

/** Throws 404 (not 403) for non-members so trip existence is not leaked. */
export function requireRole(tripId: string, profileId: string, min: TripRole): TripRole {
  const role = roleFor(tripId, profileId);
  if (!role) throw new HttpError(404, "not_found", "Trip not found");
  if (RANK[role] < RANK[min]) throw new HttpError(403, "forbidden", "Insufficient permissions");
  return role;
}

export function addMember(tripId: string, profileId: string, role: TripRole) {
  db()
    .prepare(
      `INSERT INTO trip_members (id, trip_id, profile_id, role, created_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(trip_id, profile_id) DO UPDATE SET role = excluded.role`
    )
    .run(uid(), tripId, profileId, role, nowIso());
}

export function logActivity(tripId: string, actorId: string | null, action: string, target?: string, detail?: unknown) {
  db()
    .prepare("INSERT INTO trip_activity_log (id, trip_id, actor_id, action, target, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(uid(), tripId, actorId, action, target ?? null, detail == null ? null : JSON.stringify(detail), nowIso());
}

/** Fixed-window rate limiter backed by SQLite (per key). */
export function rateLimit(key: string, max: number, windowSec: number): void {
  const d = db();
  const now = Date.now();
  const row = d.prepare("SELECT window_start, count FROM rate_limits WHERE key = ?").get(key) as
    | { window_start: string; count: number }
    | undefined;
  if (!row || now - Date.parse(row.window_start) > windowSec * 1000) {
    d.prepare(
      "INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1) ON CONFLICT(key) DO UPDATE SET window_start = excluded.window_start, count = 1"
    ).run(key, new Date(now).toISOString());
    return;
  }
  if (row.count >= max) throw new HttpError(429, "rate_limited", "Too many requests — please slow down.");
  d.prepare("UPDATE rate_limits SET count = count + 1 WHERE key = ?").run(key);
}
