import { db, nowIso, uid } from "../db";
import { HttpError, logActivity } from "../authz";
import { touchTrip } from "./trips";
import type { ChangeSet, ItemCreateInput } from "../schemas";

export interface ItemRow {
  id: string;
  trip_id: string;
  day_id: string | null;
  place_id: string | null;
  name: string;
  category: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  start_time: string | null;
  end_time: string | null;
  duration_min: number | null;
  cost: number | null;
  currency: string | null;
  reservation_status: string;
  confirmation_number: string | null;
  notes: string | null;
  locked: number;
  completed: number;
  priority: string;
  slot: string | null;
  sort_order: number;
  source: string;
  package_id: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export function itemToDto(r: ItemRow) {
  return {
    id: r.id,
    tripId: r.trip_id,
    dayId: r.day_id,
    placeId: r.place_id,
    name: r.name,
    category: r.category,
    address: r.address,
    lat: r.lat,
    lng: r.lng,
    startTime: r.start_time,
    endTime: r.end_time,
    durationMin: r.duration_min,
    cost: r.cost,
    currency: r.currency,
    reservationStatus: r.reservation_status,
    confirmationNumber: r.confirmation_number,
    notes: r.notes,
    locked: !!r.locked,
    completed: !!r.completed,
    priority: r.priority as "must" | "normal" | "low",
    slot: r.slot as "morning" | "afternoon" | "evening" | null,
    sortOrder: r.sort_order,
    source: r.source,
    packageId: r.package_id,
    updatedAt: r.updated_at,
  };
}
export type ItemDto = ReturnType<typeof itemToDto>;

export function listItems(tripId: string): ItemDto[] {
  const rows = db()
    .prepare("SELECT * FROM itinerary_items WHERE trip_id = ? AND deleted_at IS NULL ORDER BY day_id, sort_order")
    .all(tripId) as unknown as ItemRow[];
  return rows.map(itemToDto);
}

export function getItem(tripId: string, itemId: string): ItemDto {
  const row = db()
    .prepare("SELECT * FROM itinerary_items WHERE id = ? AND trip_id = ? AND deleted_at IS NULL")
    .get(itemId, tripId) as ItemRow | undefined;
  if (!row) throw new HttpError(404, "not_found", "Itinerary item not found");
  return itemToDto(row);
}

function snapshotItem(itemId: string, tripId: string, reason: string, actorId: string | null) {
  const row = db().prepare("SELECT * FROM itinerary_items WHERE id = ?").get(itemId);
  if (!row) return;
  db()
    .prepare("INSERT INTO itinerary_item_versions (id, item_id, trip_id, snapshot, reason, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(uid(), itemId, tripId, JSON.stringify(row), reason, actorId, nowIso());
}

export function createItem(tripId: string, input: ItemCreateInput, actorId: string): ItemDto {
  const d = db();
  const id = uid();
  const now = nowIso();
  const max = d
    .prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM itinerary_items WHERE trip_id = ? AND day_id IS ?")
    .get(tripId, input.dayId ?? null) as { m: number };
  d.prepare(
    `INSERT INTO itinerary_items (id, trip_id, day_id, place_id, name, category, address, lat, lng, start_time, end_time,
      duration_min, cost, currency, notes, locked, priority, slot, sort_order, source, package_id, created_by, updated_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, tripId, input.dayId ?? null, input.placeId ?? null, input.name, input.category, input.address ?? null,
    input.lat ?? null, input.lng ?? null, input.startTime ?? null, input.endTime ?? null, input.durationMin ?? null,
    input.cost ?? null, input.currency ?? null, input.notes ?? null, input.locked ? 1 : 0, input.priority,
    input.slot ?? null, max.m + 1, input.source, input.packageId ?? null, actorId, actorId, now, now
  );
  touchTrip(tripId, actorId);
  logActivity(tripId, actorId, "item.added", input.name);
  return getItem(tripId, id);
}

export function patchItem(tripId: string, itemId: string, patch: Record<string, unknown>, actorId: string): ItemDto {
  getItem(tripId, itemId); // 404 guard
  snapshotItem(itemId, tripId, "update", actorId);
  const map: Record<string, string> = {
    dayId: "day_id", placeId: "place_id", name: "name", category: "category", address: "address", lat: "lat", lng: "lng",
    startTime: "start_time", endTime: "end_time", durationMin: "duration_min", cost: "cost", currency: "currency",
    notes: "notes", slot: "slot", priority: "priority", reservationStatus: "reservation_status",
    confirmationNumber: "confirmation_number", packageId: "package_id",
  };
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [k, col] of Object.entries(map)) {
    if (k in patch) {
      sets.push(`${col} = ?`);
      vals.push(patch[k] ?? null);
    }
  }
  if ("locked" in patch) {
    sets.push("locked = ?");
    vals.push(patch.locked ? 1 : 0);
  }
  if ("completed" in patch) {
    sets.push("completed = ?");
    vals.push(patch.completed ? 1 : 0);
  }
  if (sets.length) {
    sets.push("updated_at = ?", "updated_by = ?");
    vals.push(nowIso(), actorId, itemId, tripId);
    db().prepare(`UPDATE itinerary_items SET ${sets.join(", ")} WHERE id = ? AND trip_id = ?`).run(...(vals as never[]));
    touchTrip(tripId, actorId);
  }
  return getItem(tripId, itemId);
}

export function deleteItem(tripId: string, itemId: string, actorId: string): { undoToken: string } {
  const item = getItem(tripId, itemId);
  snapshotItem(itemId, tripId, "delete", actorId);
  db().prepare("UPDATE itinerary_items SET deleted_at = ?, updated_at = ? WHERE id = ? AND trip_id = ?").run(nowIso(), nowIso(), itemId, tripId);
  touchTrip(tripId, actorId);
  logActivity(tripId, actorId, "item.deleted", item.name, { itemId });
  return { undoToken: itemId };
}

export function undeleteItem(tripId: string, itemId: string, actorId: string): ItemDto {
  db().prepare("UPDATE itinerary_items SET deleted_at = NULL, updated_at = ? WHERE id = ? AND trip_id = ?").run(nowIso(), itemId, tripId);
  touchTrip(tripId, actorId);
  logActivity(tripId, actorId, "item.restored", itemId);
  return getItem(tripId, itemId);
}

export function duplicateItem(tripId: string, itemId: string, actorId: string): ItemDto {
  const src = getItem(tripId, itemId);
  return createItem(
    tripId,
    {
      dayId: src.dayId, placeId: src.placeId, name: `${src.name} (copy)`, category: src.category as ItemCreateInput["category"],
      address: src.address, lat: src.lat, lng: src.lng, startTime: null, endTime: null, durationMin: src.durationMin,
      cost: src.cost, currency: src.currency, notes: src.notes, slot: src.slot, priority: src.priority, locked: false,
      source: "manual", packageId: src.packageId,
    },
    actorId
  );
}

export function reorderItems(tripId: string, dayId: string | null, orderedIds: string[], actorId: string) {
  const d = db();
  const upd = d.prepare("UPDATE itinerary_items SET day_id = ?, sort_order = ?, updated_at = ?, updated_by = ? WHERE id = ? AND trip_id = ? AND deleted_at IS NULL");
  const now = nowIso();
  orderedIds.forEach((id, i) => upd.run(dayId, i, now, actorId, id, tripId));
  touchTrip(tripId, actorId);
  logActivity(tripId, actorId, "items.reordered", dayId ?? "unscheduled", { count: orderedIds.length });
}

/** Apply a validated ChangeSet; returns an undo snapshot of affected rows. */
export function applyChangeSet(tripId: string, changes: ChangeSet, actorId: string) {
  const d = db();
  const days = d.prepare("SELECT id, day_index FROM trip_days WHERE trip_id = ? ORDER BY day_index").all(tripId) as { id: string; day_index: number }[];
  const dayByIndex = new Map(days.map((x) => [x.day_index, x.id]));
  const affected = new Set<string>();
  const created: string[] = [];

  for (const r of changes.removes) affected.add(r.itemId);
  for (const m of changes.moves) affected.add(m.itemId);
  for (const u of changes.updates) affected.add(u.itemId);
  const undoRows = [...affected]
    .map((id) => d.prepare("SELECT * FROM itinerary_items WHERE id = ? AND trip_id = ?").get(id, tripId))
    .filter(Boolean);

  for (const add of changes.adds) {
    const dayId = add.dayIndex != null ? dayByIndex.get(add.dayIndex) ?? null : add.dayId ?? null;
    const item = createItem(tripId, { ...add, dayId, source: "ai" }, actorId);
    created.push(item.id);
  }
  for (const rem of changes.removes) {
    const row = d.prepare("SELECT locked FROM itinerary_items WHERE id = ? AND trip_id = ?").get(rem.itemId, tripId) as { locked: number } | undefined;
    if (!row) continue;
    if (row.locked) throw new HttpError(400, "locked_item", "A locked activity cannot be removed.");
    deleteItem(tripId, rem.itemId, actorId);
  }
  for (const mv of changes.moves) {
    const dayId = dayByIndex.get(mv.toDayIndex);
    if (!dayId) continue;
    patchItem(tripId, mv.itemId, { dayId, slot: mv.toSlot ?? null }, actorId);
  }
  for (const up of changes.updates) patchItem(tripId, up.itemId, up.patch as Record<string, unknown>, actorId);

  return { undo: { rows: undoRows, createdIds: created } };
}

/** Restore an undo snapshot captured by applyChangeSet. */
export function revertChangeSet(tripId: string, undo: { rows: unknown[]; createdIds: string[] }, actorId: string) {
  const d = db();
  for (const id of undo.createdIds) {
    d.prepare("UPDATE itinerary_items SET deleted_at = ? WHERE id = ? AND trip_id = ?").run(nowIso(), id, tripId);
  }
  for (const raw of undo.rows) {
    const r = raw as ItemRow;
    d.prepare(
      `UPDATE itinerary_items SET day_id=?, name=?, category=?, address=?, lat=?, lng=?, start_time=?, end_time=?,
        duration_min=?, cost=?, currency=?, notes=?, locked=?, priority=?, slot=?, sort_order=?, deleted_at=?, updated_at=? WHERE id=? AND trip_id=?`
    ).run(
      r.day_id, r.name, r.category, r.address, r.lat, r.lng, r.start_time, r.end_time, r.duration_min, r.cost,
      r.currency, r.notes, r.locked, r.priority, r.slot, r.sort_order, r.deleted_at, nowIso(), r.id, tripId
    );
  }
  touchTrip(tripId, actorId);
  logActivity(tripId, actorId, "changeset.undone");
}
