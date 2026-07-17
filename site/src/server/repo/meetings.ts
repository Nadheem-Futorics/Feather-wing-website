import { db, nowIso, uid } from "../db";
import { HttpError } from "../authz";
import { calendarProvider } from "../providers/calendar";
import type { z } from "zod";
import type { meetingCreateSchema, meetingPatchSchema } from "../schemas";

interface MeetingRow {
  id: string; title: string; customer_name: string; email: string | null; phone: string | null; notes: string | null;
  start_at: string; end_at: string; status: string; calendar_provider: string | null;
  calendar_event_id: string | null; calendar_event_link: string | null; created_at: string; updated_at: string;
}

function meetingDto(r: MeetingRow) {
  return {
    id: r.id, title: r.title, customerName: r.customer_name, email: r.email, phone: r.phone, notes: r.notes,
    startAt: r.start_at, endAt: r.end_at, status: r.status, calendarProvider: r.calendar_provider,
    calendarEventId: r.calendar_event_id, calendarEventLink: r.calendar_event_link,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}
export type MeetingDto = ReturnType<typeof meetingDto>;

function addMinutesIso(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

export function listMeetings(): MeetingDto[] {
  return (db().prepare("SELECT * FROM meetings ORDER BY start_at ASC").all() as unknown as MeetingRow[]).map(meetingDto);
}

export function getMeeting(id: string): MeetingDto {
  const r = db().prepare("SELECT * FROM meetings WHERE id = ?").get(id) as MeetingRow | undefined;
  if (!r) throw new HttpError(404, "not_found", "Meeting not found");
  return meetingDto(r);
}

/** Creates the meeting locally and best-effort syncs it to Google Calendar (or the dev fallback). */
export async function createMeeting(input: z.infer<typeof meetingCreateSchema>): Promise<MeetingDto> {
  const id = uid();
  const now = nowIso();
  const startAt = new Date(input.startAt).toISOString();
  const endAt = addMinutesIso(startAt, input.durationMin);

  const provider = calendarProvider();
  let calendarEventId: string | null = null;
  let calendarEventLink: string | null = null;
  try {
    const ev = await provider.createEvent({
      title: input.title,
      description: [input.notes, input.phone ? `Phone: ${input.phone}` : null].filter(Boolean).join("\n") || undefined,
      startAt,
      endAt,
      attendeeEmail: input.email,
    });
    calendarEventId = ev.id;
    calendarEventLink = ev.htmlLink ?? null;
  } catch (e) {
    console.error("[calendar]", e instanceof Error ? e.message : e);
  }

  db().prepare(
    `INSERT INTO meetings (id, title, customer_name, email, phone, notes, start_at, end_at, status,
      calendar_provider, calendar_event_id, calendar_event_link, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?, ?)`
  ).run(id, input.title, input.customerName, input.email ?? null, input.phone ?? null, input.notes ?? null,
    startAt, endAt, provider.id, calendarEventId, calendarEventLink, now, now);
  return getMeeting(id);
}

export async function updateMeeting(id: string, patch: z.infer<typeof meetingPatchSchema>): Promise<MeetingDto> {
  const existing = getMeeting(id);
  const startAt = patch.startAt ? new Date(patch.startAt).toISOString() : existing.startAt;
  const durationMin = patch.durationMin ?? Math.round((new Date(existing.endAt).getTime() - new Date(existing.startAt).getTime()) / 60_000);
  const endAt = addMinutesIso(startAt, durationMin);
  const rescheduled = startAt !== existing.startAt || endAt !== existing.endAt || patch.notes !== undefined;

  const provider = calendarProvider();
  if (existing.calendarEventId && patch.status !== "cancelled") {
    if (rescheduled) {
      try {
        await provider.updateEvent(existing.calendarEventId, { startAt, endAt, description: patch.notes });
      } catch (e) {
        console.error("[calendar]", e instanceof Error ? e.message : e);
      }
    }
  }
  if (patch.status === "cancelled" && existing.calendarEventId) {
    try {
      await provider.cancelEvent(existing.calendarEventId);
    } catch (e) {
      console.error("[calendar]", e instanceof Error ? e.message : e);
    }
  }

  db().prepare(
    `UPDATE meetings SET status = COALESCE(?, status), start_at = ?, end_at = ?, notes = COALESCE(?, notes), updated_at = ? WHERE id = ?`
  ).run(patch.status ?? null, startAt, endAt, patch.notes ?? null, nowIso(), id);
  return getMeeting(id);
}

export async function deleteMeeting(id: string): Promise<void> {
  const existing = getMeeting(id);
  if (existing.calendarEventId) {
    try {
      await calendarProvider().cancelEvent(existing.calendarEventId);
    } catch (e) {
      console.error("[calendar]", e instanceof Error ? e.message : e);
    }
  }
  const r = db().prepare("DELETE FROM meetings WHERE id = ?").run(id);
  if (Number(r.changes) === 0) throw new HttpError(404, "not_found");
}
