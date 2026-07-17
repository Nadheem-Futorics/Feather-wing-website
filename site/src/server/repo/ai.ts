import { db, nowIso, uid, fromJson } from "../db";
import { HttpError } from "../authz";
import type { ChangeSet } from "../schemas";

export function getOrCreateConversation(tripId: string, conversationId: string | undefined, actorId: string): string {
  if (conversationId) {
    const row = db().prepare("SELECT id FROM ai_conversations WHERE id = ? AND trip_id = ?").get(conversationId, tripId);
    if (row) return conversationId;
  }
  const id = uid();
  db().prepare("INSERT INTO ai_conversations (id, trip_id, created_by, created_at) VALUES (?, ?, ?, ?)").run(id, tripId, actorId, nowIso());
  return id;
}

export function saveMessage(conversationId: string, role: "user" | "assistant", content: unknown) {
  db().prepare("INSERT INTO ai_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(uid(), conversationId, role, JSON.stringify(content), nowIso());
}

export function listMessages(conversationId: string, limit = 30) {
  return (db().prepare("SELECT role, content, created_at FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?").all(conversationId, limit) as {
    role: string; content: string; created_at: string;
  }[]).map((r) => ({ role: r.role as "user" | "assistant", content: fromJson<unknown>(r.content, r.content), at: r.created_at }));
}

export function latestConversation(tripId: string): string | null {
  const row = db().prepare("SELECT id FROM ai_conversations WHERE trip_id = ? ORDER BY created_at DESC LIMIT 1").get(tripId) as { id: string } | undefined;
  return row?.id ?? null;
}

export function logToolCall(conversationId: string, tool: string, input: unknown, output: unknown, ok: boolean) {
  db().prepare("INSERT INTO ai_tool_calls (id, conversation_id, tool, input, output, ok, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(uid(), conversationId, tool, JSON.stringify(input ?? null), JSON.stringify(output ?? null), ok ? 1 : 0, nowIso());
}

export function createProposal(tripId: string, conversationId: string | null, summary: string, changes: ChangeSet, impact: unknown, actorId: string) {
  const id = uid();
  db().prepare(
    "INSERT INTO ai_change_proposals (id, trip_id, conversation_id, summary, changes, impact, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)"
  ).run(id, tripId, conversationId, summary, JSON.stringify(changes), JSON.stringify(impact ?? null), actorId, nowIso());
  return id;
}

export function getProposal(tripId: string, proposalId: string) {
  const r = db().prepare("SELECT * FROM ai_change_proposals WHERE id = ? AND trip_id = ?").get(proposalId, tripId) as
    | { id: string; summary: string; changes: string; impact: string | null; status: string; undo_snapshot: string | null; created_at: string }
    | undefined;
  if (!r) throw new HttpError(404, "not_found", "Proposal not found");
  return {
    id: r.id, summary: r.summary, changes: fromJson<ChangeSet>(r.changes, { adds: [], removes: [], moves: [], updates: [] }),
    impact: fromJson<unknown>(r.impact, null), status: r.status, undoSnapshot: fromJson<unknown>(r.undo_snapshot, null), createdAt: r.created_at,
  };
}

export function listPendingProposals(tripId: string) {
  return (db().prepare("SELECT id, summary, changes, impact, status, created_at FROM ai_change_proposals WHERE trip_id = ? AND status = 'pending' ORDER BY created_at DESC").all(tripId) as {
    id: string; summary: string; changes: string; impact: string | null; status: string; created_at: string;
  }[]).map((r) => ({
    id: r.id, summary: r.summary, changes: fromJson<ChangeSet>(r.changes, { adds: [], removes: [], moves: [], updates: [] }),
    impact: fromJson<unknown>(r.impact, null), status: r.status, createdAt: r.created_at,
  }));
}

export function resolveProposal(tripId: string, proposalId: string, status: "applied" | "rejected" | "undone", undoSnapshot?: unknown) {
  db().prepare("UPDATE ai_change_proposals SET status = ?, undo_snapshot = COALESCE(?, undo_snapshot), resolved_at = ? WHERE id = ? AND trip_id = ?")
    .run(status, undoSnapshot == null ? null : JSON.stringify(undoSnapshot), nowIso(), proposalId, tripId);
}
