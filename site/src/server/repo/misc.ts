import { db, nowIso, uid, fromJson, asJson } from "../db";
import { HttpError, logActivity } from "../authz";
import { convertToBase } from "../providers/fx";
import type { z } from "zod";
import type { expenseCreateSchema, reservationCreateSchema, checklistCreateSchema, checklistItemSchema } from "../schemas";

/* ── Expenses ─────────────────────────────────────────────── */

export function listExpenses(tripId: string) {
  const rows = db().prepare("SELECT * FROM expenses WHERE trip_id = ? AND deleted_at IS NULL ORDER BY spent_at DESC, created_at DESC").all(tripId) as {
    id: string; title: string; category: string; amount: number; currency: string; base_amount: number | null; base_currency: string | null;
    fx_rate: number | null; paid_by: string | null; spent_at: string | null; planned: number; notes: string | null; created_at: string;
  }[];
  const splits = db().prepare(
    "SELECT s.* FROM expense_splits s JOIN expenses e ON e.id = s.expense_id WHERE e.trip_id = ?"
  ).all(tripId) as { id: string; expense_id: string; profile_id: string; share: number }[];
  const byExpense = new Map<string, { profileId: string; share: number }[]>();
  for (const s of splits) {
    const arr = byExpense.get(s.expense_id) ?? [];
    arr.push({ profileId: s.profile_id, share: s.share });
    byExpense.set(s.expense_id, arr);
  }
  return rows.map((r) => ({
    id: r.id, title: r.title, category: r.category, amount: r.amount, currency: r.currency,
    baseAmount: r.base_amount, baseCurrency: r.base_currency, fxRate: r.fx_rate, paidBy: r.paid_by,
    spentAt: r.spent_at, planned: !!r.planned, notes: r.notes, splits: byExpense.get(r.id) ?? [],
  }));
}

export function createExpense(tripId: string, input: z.infer<typeof expenseCreateSchema>, baseCurrency: string, actorId: string) {
  const d = db();
  const id = uid();
  const now = nowIso();
  const fx = convertToBase(input.amount, input.currency, baseCurrency);
  d.prepare(
    `INSERT INTO expenses (id, trip_id, title, category, amount, currency, base_amount, base_currency, fx_rate, paid_by, spent_at, planned, notes, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, tripId, input.title, input.category, input.amount, input.currency, fx.amount, baseCurrency, fx.rate,
    input.paidBy ?? actorId, input.spentAt ?? now.slice(0, 10), input.planned ? 1 : 0, input.notes ?? null, actorId, now, now);

  const ins = d.prepare("INSERT INTO expense_splits (id, expense_id, profile_id, share, created_at) VALUES (?, ?, ?, ?, ?)");
  if (input.splits?.length) {
    for (const s of input.splits) ins.run(uid(), id, s.profileId, s.share, now);
  } else if (input.splitEqualAmong?.length) {
    for (const sh of splitEqually(input.amount, input.splitEqualAmong)) ins.run(uid(), id, sh.profileId, sh.share, now);
  }
  logActivity(tripId, actorId, "expense.added", input.title, { amount: input.amount, currency: input.currency });
  return id;
}

export function deleteExpense(tripId: string, expenseId: string, actorId: string) {
  const r = db().prepare("UPDATE expenses SET deleted_at = ? WHERE id = ? AND trip_id = ?").run(nowIso(), expenseId, tripId);
  if (Number(r.changes) === 0) throw new HttpError(404, "not_found");
  logActivity(tripId, actorId, "expense.deleted", expenseId);
}

/** Equal split that conserves the total to the cent (remainder to first payers). */
export function splitEqually(amount: number, profileIds: string[]): { profileId: string; share: number }[] {
  const cents = Math.round(amount * 100);
  const base = Math.floor(cents / profileIds.length);
  let remainder = cents - base * profileIds.length;
  return profileIds.map((profileId) => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    return { profileId, share: (base + extra) / 100 };
  });
}

/** Net balances per profile in trip base currency: paid − owed. */
export function settlementSummary(tripId: string) {
  const expenses = listExpenses(tripId).filter((e) => !e.planned);
  const net = new Map<string, number>();
  for (const e of expenses) {
    const amount = e.baseAmount ?? e.amount;
    if (e.paidBy) net.set(e.paidBy, (net.get(e.paidBy) ?? 0) + amount);
    const splits = e.splits.length ? e.splits : e.paidBy ? [{ profileId: e.paidBy, share: e.amount }] : [];
    const totalShare = splits.reduce((s, x) => s + x.share, 0) || 1;
    for (const s of splits) {
      const owed = (s.share / totalShare) * amount;
      net.set(s.profileId, (net.get(s.profileId) ?? 0) - owed);
    }
  }
  return [...net.entries()].map(([profileId, balance]) => ({ profileId, balance: Math.round(balance * 100) / 100 }));
}

/* ── Reservations ─────────────────────────────────────────── */

export function listReservations(tripId: string) {
  return (db().prepare("SELECT * FROM reservations WHERE trip_id = ? AND deleted_at IS NULL ORDER BY start_at").all(tripId) as {
    id: string; type: string; provider: string | null; confirmation_number: string | null; start_at: string | null; end_at: string | null;
    location: string | null; traveler_names: string | null; price: number | null; currency: string | null; status: string; notes: string | null;
  }[]).map((r) => ({
    id: r.id, type: r.type, provider: r.provider, confirmationNumber: r.confirmation_number, startAt: r.start_at, endAt: r.end_at,
    location: r.location, travelerNames: fromJson<string[]>(r.traveler_names, []), price: r.price, currency: r.currency, status: r.status, notes: r.notes,
  }));
}

export function createReservation(tripId: string, input: z.infer<typeof reservationCreateSchema>, actorId: string) {
  const id = uid();
  const now = nowIso();
  db().prepare(
    `INSERT INTO reservations (id, trip_id, type, provider, confirmation_number, start_at, end_at, location, traveler_names, price, currency, status, notes, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, tripId, input.type, input.provider ?? null, input.confirmationNumber ?? null, input.startAt ?? null, input.endAt ?? null,
    input.location ?? null, asJson(input.travelerNames ?? []), input.price ?? null, input.currency ?? null, input.status, input.notes ?? null, actorId, now, now);
  logActivity(tripId, actorId, "reservation.added", input.type);
  return id;
}

export function deleteReservation(tripId: string, id: string, actorId: string) {
  const r = db().prepare("UPDATE reservations SET deleted_at = ? WHERE id = ? AND trip_id = ?").run(nowIso(), id, tripId);
  if (Number(r.changes) === 0) throw new HttpError(404, "not_found");
  logActivity(tripId, actorId, "reservation.deleted", id);
}

/* ── Documents (private storage + DB metadata) ────────────── */

export function createDocument(tripId: string, meta: { fileName: string; mime: string; size: number; storagePath: string; kind: string; reservationId?: string | null }, actorId: string) {
  const id = uid();
  db().prepare(
    "INSERT INTO trip_documents (id, trip_id, reservation_id, file_name, mime, size, storage_path, kind, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, tripId, meta.reservationId ?? null, meta.fileName, meta.mime, meta.size, meta.storagePath, meta.kind, actorId, nowIso());
  logActivity(tripId, actorId, "document.uploaded", meta.fileName);
  return id;
}

export function listDocuments(tripId: string) {
  return (db().prepare("SELECT * FROM trip_documents WHERE trip_id = ? ORDER BY created_at DESC").all(tripId) as {
    id: string; file_name: string; mime: string; size: number; kind: string; created_at: string; reservation_id: string | null;
  }[]).map((r) => ({ id: r.id, fileName: r.file_name, mime: r.mime, size: r.size, kind: r.kind, createdAt: r.created_at, reservationId: r.reservation_id }));
}

export function getDocument(tripId: string, docId: string) {
  const row = db().prepare("SELECT * FROM trip_documents WHERE id = ? AND trip_id = ?").get(docId, tripId) as
    | { id: string; file_name: string; mime: string; storage_path: string }
    | undefined;
  if (!row) throw new HttpError(404, "not_found");
  return { id: row.id, fileName: row.file_name, mime: row.mime, storagePath: row.storage_path };
}

/* ── Checklists ───────────────────────────────────────────── */

export function listChecklists(tripId: string) {
  const lists = db().prepare("SELECT * FROM checklists WHERE trip_id = ? ORDER BY sort_order, created_at").all(tripId) as {
    id: string; name: string; kind: string;
  }[];
  const items = db().prepare(
    "SELECT ci.* FROM checklist_items ci JOIN checklists c ON c.id = ci.checklist_id WHERE c.trip_id = ? ORDER BY ci.sort_order"
  ).all(tripId) as { id: string; checklist_id: string; text: string; done: number; assignee: string | null; due_date: string | null; source: string }[];
  return lists.map((l) => ({
    id: l.id, name: l.name, kind: l.kind,
    items: items.filter((i) => i.checklist_id === l.id).map((i) => ({ id: i.id, text: i.text, done: !!i.done, assignee: i.assignee, dueDate: i.due_date, source: i.source })),
  }));
}

export function createChecklist(tripId: string, input: z.infer<typeof checklistCreateSchema>, actorId: string) {
  const id = uid();
  db().prepare("INSERT INTO checklists (id, trip_id, name, kind, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(id, tripId, input.name, input.kind, actorId, nowIso());
  return id;
}

export function addChecklistItems(tripId: string, checklistId: string, items: z.infer<typeof checklistItemSchema>[], source: "manual" | "ai") {
  const owner = db().prepare("SELECT trip_id FROM checklists WHERE id = ?").get(checklistId) as { trip_id: string } | undefined;
  if (!owner || owner.trip_id !== tripId) throw new HttpError(404, "not_found");
  const max = db().prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM checklist_items WHERE checklist_id = ?").get(checklistId) as { m: number };
  const ins = db().prepare("INSERT INTO checklist_items (id, checklist_id, text, done, assignee, due_date, sort_order, source, created_at) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?)");
  const now = nowIso();
  items.forEach((it, i) => ins.run(uid(), checklistId, it.text, it.assignee ?? null, it.dueDate ?? null, max.m + 1 + i, source, now));
}

export function toggleChecklistItem(tripId: string, itemId: string, done: boolean) {
  const r = db().prepare(
    `UPDATE checklist_items SET done = ? WHERE id = ? AND checklist_id IN (SELECT id FROM checklists WHERE trip_id = ?)`
  ).run(done ? 1 : 0, itemId, tripId);
  if (Number(r.changes) === 0) throw new HttpError(404, "not_found");
}

export function deleteChecklistItem(tripId: string, itemId: string) {
  db().prepare(
    "DELETE FROM checklist_items WHERE id = ? AND checklist_id IN (SELECT id FROM checklists WHERE trip_id = ?)"
  ).run(itemId, tripId);
}

/* ── Comments ─────────────────────────────────────────────── */

export function listComments(tripId: string) {
  return (db().prepare(
    `SELECT c.*, p.display_name FROM trip_comments c LEFT JOIN profiles p ON p.id = c.author_id WHERE c.trip_id = ? ORDER BY c.created_at DESC LIMIT 100`
  ).all(tripId) as { id: string; item_id: string | null; body: string; created_at: string; display_name: string | null }[]).map((r) => ({
    id: r.id, itemId: r.item_id, body: r.body, at: r.created_at, author: r.display_name ?? "Traveller",
  }));
}

export function addComment(tripId: string, body: string, itemId: string | null, authorId: string) {
  db().prepare("INSERT INTO trip_comments (id, trip_id, item_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(uid(), tripId, itemId, authorId, body, nowIso());
  logActivity(tripId, authorId, "comment.added", itemId ?? undefined);
}
