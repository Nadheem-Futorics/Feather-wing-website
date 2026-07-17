import { createSign } from "node:crypto";

/**
 * Meeting-scheduling calendar backend.
 * Provider abstraction: a real Google Calendar (via a Service Account —
 * no OAuth consent flow, no npm SDK) when GOOGLE_CALENDAR_* env vars are
 * set, otherwise a labeled development provider that only stores the
 * meeting locally (src/server/repo/meetings.ts) without touching a real
 * calendar. Same pattern as the site's other live/dev-fallback providers.
 *
 * Setup for the live provider:
 *  1. Google Cloud Console → create a project → enable the "Google Calendar API".
 *  2. Create a Service Account → add a JSON key → note its client_email + private_key.
 *  3. In Google Calendar, share the target calendar with that client_email
 *     ("Make changes to events" permission) and copy its Calendar ID.
 *  4. Set GOOGLE_CALENDAR_CLIENT_EMAIL, GOOGLE_CALENDAR_PRIVATE_KEY, GOOGLE_CALENDAR_ID.
 */

export interface CalendarEventInput {
  title: string;
  description?: string;
  startAt: string; // ISO 8601
  endAt: string; // ISO 8601
  attendeeEmail?: string;
}

export interface CalendarEventResult {
  id: string;
  htmlLink?: string;
}

export interface CalendarProvider {
  readonly id: string;
  createEvent(input: CalendarEventInput): Promise<CalendarEventResult>;
  updateEvent(eventId: string, input: Partial<CalendarEventInput>): Promise<void>;
  cancelEvent(eventId: string): Promise<void>;
}

class GoogleCalendarProvider implements CalendarProvider {
  readonly id = "google";
  private calendarId: string;
  private clientEmail: string;
  private privateKey: string;
  private tokenCache: { token: string; exp: number } | null = null;

  constructor(clientEmail: string, privateKey: string, calendarId: string) {
    this.clientEmail = clientEmail;
    this.privateKey = privateKey.includes("\\n") ? privateKey.replace(/\\n/g, "\n") : privateKey;
    this.calendarId = calendarId;
  }

  private async accessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.tokenCache && this.tokenCache.exp - 60 > now) return this.tokenCache.token;

    const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const unsigned = `${b64url({ alg: "RS256", typ: "JWT" })}.${b64url({
      iss: this.clientEmail,
      scope: "https://www.googleapis.com/auth/calendar",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })}`;
    const signer = createSign("RSA-SHA256");
    signer.update(unsigned);
    signer.end();
    const signature = signer.sign(this.privateKey).toString("base64url");
    const jwt = `${unsigned}.${signature}`;

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
    });
    if (!res.ok) throw new Error(`Google Calendar auth failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.tokenCache = { token: data.access_token, exp: now + data.expires_in };
    return data.access_token;
  }

  private eventsUrl(suffix = ""): string {
    return `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.calendarId)}/events${suffix}`;
  }

  async createEvent(input: CalendarEventInput): Promise<CalendarEventResult> {
    const token = await this.accessToken();
    const res = await fetch(`${this.eventsUrl()}?sendUpdates=all`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: input.title,
        description: input.description,
        start: { dateTime: input.startAt },
        end: { dateTime: input.endAt },
        attendees: input.attendeeEmail ? [{ email: input.attendeeEmail }] : undefined,
      }),
    });
    if (!res.ok) throw new Error(`Google Calendar create failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { id: string; htmlLink?: string };
    return { id: data.id, htmlLink: data.htmlLink };
  }

  async updateEvent(eventId: string, input: Partial<CalendarEventInput>): Promise<void> {
    const token = await this.accessToken();
    const body: Record<string, unknown> = {};
    if (input.title !== undefined) body.summary = input.title;
    if (input.description !== undefined) body.description = input.description;
    if (input.startAt) body.start = { dateTime: input.startAt };
    if (input.endAt) body.end = { dateTime: input.endAt };
    const res = await fetch(`${this.eventsUrl(`/${eventId}`)}?sendUpdates=all`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Google Calendar update failed: ${res.status} ${await res.text()}`);
  }

  async cancelEvent(eventId: string): Promise<void> {
    const token = await this.accessToken();
    const res = await fetch(`${this.eventsUrl(`/${eventId}`)}?sendUpdates=all`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok && res.status !== 410 && res.status !== 404) {
      throw new Error(`Google Calendar cancel failed: ${res.status} ${await res.text()}`);
    }
  }
}

/** No real calendar — the meeting only lives in the local trip-planner database. */
class DevCalendarProvider implements CalendarProvider {
  readonly id = "dev";
  async createEvent(): Promise<CalendarEventResult> {
    return { id: `dev-${crypto.randomUUID()}` };
  }
  async updateEvent(): Promise<void> {}
  async cancelEvent(): Promise<void> {}
}

export function calendarProvider(): CalendarProvider {
  const clientEmail = process.env.GOOGLE_CALENDAR_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_CALENDAR_PRIVATE_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (clientEmail && privateKey && calendarId) return new GoogleCalendarProvider(clientEmail, privateKey, calendarId);
  return new DevCalendarProvider();
}
