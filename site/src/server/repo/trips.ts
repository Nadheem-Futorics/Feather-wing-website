import { db, nowIso, uid, asJson, fromJson } from "../db";
import { addMember, logActivity, HttpError } from "../authz";
import type { TripCreateInput } from "../schemas";

export interface TripRow {
  id: string;
  name: string;
  origin: string | null;
  start_date: string | null;
  end_date: string | null;
  adults: number;
  children: number;
  child_ages: string | null;
  party_type: string;
  currency: string;
  budget_total: number | null;
  budget_per_person: number;
  accommodation_level: string | null;
  pace: string;
  interests: string | null;
  transport_prefs: string | null;
  dietary: string | null;
  accessibility: string | null;
  day_start: string;
  day_end: string;
  notes: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export function tripToDto(t: TripRow) {
  return {
    id: t.id,
    name: t.name,
    origin: t.origin,
    startDate: t.start_date,
    endDate: t.end_date,
    adults: t.adults,
    children: t.children,
    childAges: fromJson<number[]>(t.child_ages, []),
    partyType: t.party_type,
    currency: t.currency,
    budgetTotal: t.budget_total,
    budgetPerPerson: !!t.budget_per_person,
    accommodationLevel: t.accommodation_level,
    pace: t.pace as "relaxed" | "balanced" | "packed",
    interests: fromJson<string[]>(t.interests, []),
    transportPrefs: fromJson<string[]>(t.transport_prefs, []),
    dietary: t.dietary,
    accessibility: t.accessibility,
    dayStart: t.day_start,
    dayEnd: t.day_end,
    notes: t.notes,
    status: t.status,
    createdBy: t.created_by,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    version: t.version,
  };
}
export type TripDto = ReturnType<typeof tripToDto>;

function dateRangeDays(start?: string, end?: string): number {
  if (!start || !end) return 3;
  const n = Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1;
  return Math.min(Math.max(n, 1), 60);
}

export function createTrip(input: TripCreateInput, ownerId: string): TripDto {
  const d = db();
  const id = uid();
  const now = nowIso();
  d.prepare(
    `INSERT INTO trips (id, name, origin, start_date, end_date, adults, children, child_ages, party_type, currency,
      budget_total, budget_per_person, accommodation_level, pace, interests, transport_prefs, dietary, accessibility,
      day_start, day_end, notes, status, created_by, created_at, updated_at, version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'planning', ?, ?, ?, 1)`
  ).run(
    id, input.name, input.origin ?? null, input.startDate ?? null, input.endDate ?? null,
    input.adults, input.children, asJson(input.childAges ?? []), input.partyType, input.currency,
    input.budgetTotal ?? null, input.budgetPerPerson ? 1 : 0, input.accommodationLevel ?? null, input.pace,
    asJson(input.interests), asJson(input.transportPrefs), input.dietary ?? null, input.accessibility ?? null,
    input.dayStart, input.dayEnd, input.notes ?? null, ownerId, now, now
  );

  const insDest = d.prepare(
    "INSERT INTO trip_destinations (id, trip_id, name, country, lat, lng, sort_order, nights, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const destIds: string[] = [];
  input.destinations.forEach((dest, i) => {
    const did = uid();
    destIds.push(did);
    insDest.run(did, id, dest.name, dest.country ?? null, dest.lat ?? null, dest.lng ?? null, i, dest.nights ?? null, now);
  });

  // Create day rows across the date range (or a default 3-day skeleton).
  const nDays = dateRangeDays(input.startDate, input.endDate);
  const insDay = d.prepare(
    "INSERT INTO trip_days (id, trip_id, date, day_index, destination_id, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const perDest = Math.max(1, Math.ceil(nDays / destIds.length));
  for (let i = 0; i < nDays; i++) {
    const date = input.startDate ? new Date(Date.parse(input.startDate) + i * 86_400_000).toISOString().slice(0, 10) : null;
    const destId = destIds[Math.min(Math.floor(i / perDest), destIds.length - 1)];
    insDay.run(uid(), id, date, i, destId, now);
  }

  addMember(id, ownerId, "owner");
  logActivity(id, ownerId, "trip.created", id, { name: input.name });
  return tripToDto(d.prepare("SELECT * FROM trips WHERE id = ?").get(id) as unknown as TripRow);
}

export function listTripsFor(profileId: string) {
  const rows = db()
    .prepare(
      `SELECT t.*, m.role FROM trips t JOIN trip_members m ON m.trip_id = t.id
       WHERE m.profile_id = ? AND t.deleted_at IS NULL ORDER BY t.updated_at DESC`
    )
    .all(profileId) as unknown as (TripRow & { role: string })[];
  return rows.map((r) => ({ ...tripToDto(r), role: r.role }));
}

export function getTrip(tripId: string): TripDto {
  const row = db().prepare("SELECT * FROM trips WHERE id = ? AND deleted_at IS NULL").get(tripId) as TripRow | undefined;
  if (!row) throw new HttpError(404, "not_found", "Trip not found");
  return tripToDto(row);
}

export function touchTrip(tripId: string, actorId: string | null) {
  db().prepare("UPDATE trips SET updated_at = ?, version = version + 1 WHERE id = ?").run(nowIso(), tripId);
  void actorId;
}

export function patchTrip(tripId: string, patch: Record<string, unknown>, actorId: string) {
  const map: Record<string, string> = {
    name: "name", startDate: "start_date", endDate: "end_date", budgetTotal: "budget_total",
    pace: "pace", dayStart: "day_start", dayEnd: "day_end", notes: "notes", status: "status",
  };
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [k, col] of Object.entries(map)) {
    if (k in patch) {
      sets.push(`${col} = ?`);
      vals.push(patch[k] ?? null);
    }
  }
  if (!sets.length) return getTrip(tripId);
  if (typeof patch.version === "number") {
    const cur = db().prepare("SELECT version FROM trips WHERE id = ?").get(tripId) as { version: number } | undefined;
    if (cur && cur.version !== patch.version) throw new HttpError(409, "conflict", "Trip changed elsewhere — reload before saving.");
  }
  sets.push("updated_at = ?", "version = version + 1");
  vals.push(nowIso(), tripId);
  db().prepare(`UPDATE trips SET ${sets.join(", ")} WHERE id = ?`).run(...(vals as never[]));
  logActivity(tripId, actorId, "trip.updated", tripId, patch);
  return getTrip(tripId);
}

export function softDeleteTrip(tripId: string, actorId: string) {
  db().prepare("UPDATE trips SET deleted_at = ?, updated_at = ? WHERE id = ?").run(nowIso(), nowIso(), tripId);
  logActivity(tripId, actorId, "trip.deleted", tripId);
}

export function listDestinations(tripId: string) {
  return (db().prepare("SELECT * FROM trip_destinations WHERE trip_id = ? ORDER BY sort_order").all(tripId) as {
    id: string; trip_id: string; name: string; country: string | null; lat: number | null; lng: number | null; sort_order: number; nights: number | null;
  }[]).map((r) => ({ id: r.id, name: r.name, country: r.country, lat: r.lat, lng: r.lng, sortOrder: r.sort_order, nights: r.nights }));
}

export function listDays(tripId: string) {
  return (db().prepare("SELECT * FROM trip_days WHERE trip_id = ? ORDER BY day_index").all(tripId) as {
    id: string; date: string | null; day_index: number; destination_id: string | null; title: string | null; notes: string | null;
  }[]).map((r) => ({ id: r.id, date: r.date, dayIndex: r.day_index, destinationId: r.destination_id, title: r.title, notes: r.notes }));
}

export function listMembers(tripId: string) {
  return (db()
    .prepare(
      `SELECT m.id, m.role, m.profile_id, p.display_name, p.email, m.created_at
       FROM trip_members m JOIN profiles p ON p.id = m.profile_id WHERE m.trip_id = ?`
    )
    .all(tripId) as { id: string; role: string; profile_id: string; display_name: string; email: string | null; created_at: string }[]).map((r) => ({
    id: r.id, role: r.role, profileId: r.profile_id, displayName: r.display_name, email: r.email, since: r.created_at,
  }));
}

export function removeMember(tripId: string, memberProfileId: string, actorId: string) {
  const owner = db().prepare("SELECT COUNT(*) AS n FROM trip_members WHERE trip_id = ? AND role = 'owner'").get(tripId) as { n: number };
  const target = db().prepare("SELECT role FROM trip_members WHERE trip_id = ? AND profile_id = ?").get(tripId, memberProfileId) as { role: string } | undefined;
  if (target?.role === "owner" && owner.n <= 1) throw new HttpError(400, "last_owner", "A trip must keep at least one owner.");
  db().prepare("DELETE FROM trip_members WHERE trip_id = ? AND profile_id = ?").run(tripId, memberProfileId);
  logActivity(tripId, actorId, "member.removed", memberProfileId);
}

export function createInvite(tripId: string, role: "editor" | "viewer", email: string | undefined, actorId: string) {
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const expires = new Date(Date.now() + 7 * 86_400_000).toISOString();
  db()
    .prepare("INSERT INTO trip_invitations (id, trip_id, token, role, email, expires_at, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(uid(), tripId, token, role, email ?? null, expires, actorId, nowIso());
  logActivity(tripId, actorId, "invite.created", email ?? token.slice(0, 8), { role });
  return { token, role, expiresAt: expires };
}

export function acceptInvite(token: string, profileId: string) {
  const row = db().prepare("SELECT * FROM trip_invitations WHERE token = ?").get(token) as
    | { id: string; trip_id: string; role: "editor" | "viewer"; expires_at: string; accepted_by: string | null }
    | undefined;
  if (!row) throw new HttpError(404, "invalid_invite", "This invitation link is not valid.");
  if (Date.parse(row.expires_at) < Date.now()) throw new HttpError(410, "expired_invite", "This invitation has expired.");
  addMember(row.trip_id, profileId, row.role);
  db().prepare("UPDATE trip_invitations SET accepted_by = ? WHERE id = ?").run(profileId, row.id);
  logActivity(row.trip_id, profileId, "invite.accepted");
  return { tripId: row.trip_id, role: row.role };
}

export function listActivity(tripId: string, limit = 40) {
  return (db()
    .prepare(
      `SELECT a.*, p.display_name FROM trip_activity_log a LEFT JOIN profiles p ON p.id = a.actor_id
       WHERE a.trip_id = ? ORDER BY a.created_at DESC LIMIT ?`
    )
    .all(tripId, limit) as { id: string; action: string; target: string | null; detail: string | null; created_at: string; display_name: string | null }[]).map((r) => ({
    id: r.id, action: r.action, target: r.target, detail: fromJson<unknown>(r.detail, null), at: r.created_at, actor: r.display_name ?? "Someone",
  }));
}
