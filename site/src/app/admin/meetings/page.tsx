"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "../../trips/planner.css";
import PlannerShell from "@/components/planner/PlannerShell";
import AdminBar from "@/components/planner/AdminBar";
import { api, jpost, ApiError } from "@/lib/tp-client";

interface Meeting {
  id: string; title: string; customerName: string; email: string | null; phone: string | null; notes: string | null;
  startAt: string; endAt: string; status: string; calendarProvider: string | null;
  calendarEventId: string | null; calendarEventLink: string | null;
}

const DURATIONS = [15, 30, 45, 60, 90, 120];

const field = (label: string, node: React.ReactNode) => (
  <div className="tpField" style={{ margin: 0 }}>
    <label>{label}</label>
    {node}
  </div>
);

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ScheduleForm({ onSaved }: { onSaved: () => void }) {
  const empty = { title: "Consultation Call", customerName: "", email: "", phone: "", startAt: "", durationMin: 30, notes: "" };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  // Prefill the date/time picker with "next hour" once mounted (avoids computing Date.now() during render).
  useEffect(() => {
    const start = new Date(Date.now() + 60 * 60_000);
    start.setMinutes(0, 0, 0);
    const val = toLocalInputValue(start);
    queueMicrotask(() => setF((p) => (p.startAt ? p : { ...p, startAt: val })));
  }, []);

  return (
    <form
      className="tpCard"
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem", marginBottom: "1.4rem" }}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true); setErr(null);
        try {
          await jpost("/api/tp/admin/meetings", {
            title: f.title, customerName: f.customerName, email: f.email || undefined, phone: f.phone || undefined,
            notes: f.notes || undefined, startAt: new Date(f.startAt).toISOString(), durationMin: Number(f.durationMin),
          });
          setF({ ...empty, startAt: toLocalInputValue(new Date(Date.now() + 60 * 60_000)) });
          onSaved();
        } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
      }}
    >
      <h3 className="serif" style={{ gridColumn: "1 / -1", color: "var(--white)" }}>Schedule a meeting</h3>
      {field("Meeting title", <input value={f.title} onChange={(e) => set("title", e.target.value)} required />)}
      {field("Customer name", <input value={f.customerName} onChange={(e) => set("customerName", e.target.value)} required />)}
      {field("Customer email (for the calendar invite)", <input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />)}
      {field("Customer phone", <input value={f.phone} onChange={(e) => set("phone", e.target.value)} />)}
      {field("Date & time", <input type="datetime-local" value={f.startAt} onChange={(e) => set("startAt", e.target.value)} required />)}
      {field("Duration", <select value={f.durationMin} onChange={(e) => set("durationMin", e.target.value)}>{DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}</select>)}
      <div className="tpField" style={{ margin: 0, gridColumn: "1 / -1" }}>
        <label>Notes</label>
        <textarea rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="What the call is about" />
      </div>
      {err && <p className="tpErr" style={{ gridColumn: "1 / -1" }}>{err}</p>}
      <button className="tpBtn tpBtnGold" disabled={busy} type="submit" style={{ gridColumn: "1 / -1" }}>{busy ? "…" : "Schedule meeting"}</button>
    </form>
  );
}

export default function MeetingsPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [provider, setProvider] = useState<string>("dev");
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(0);

  const onError = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) { router.push("/admin/login"); return; }
    setError(e instanceof Error ? e.message : "Failed");
  }, [router]);

  const load = useCallback(() => {
    api<{ meetings: Meeting[]; calendarProvider: string }>("/api/tp/admin/meetings")
      .then((d) => { setMeetings(d.meetings); setProvider(d.calendarProvider); })
      .catch(onError);
  }, [onError]);
  useEffect(load, [load]);

  // Snapshot "now" once per load so upcoming/past sorting doesn't call Date.now() during render.
  useEffect(() => {
    const t = Date.now();
    queueMicrotask(() => setNowMs(t));
  }, [meetings]);

  const cancel = async (id: string) => {
    await jpost(`/api/tp/admin/meetings/${id}`, { status: "cancelled" }, "PATCH");
    load();
  };
  const remove = async (id: string) => {
    await jpost(`/api/tp/admin/meetings/${id}`, {}, "DELETE");
    load();
  };

  const upcoming = meetings.filter((m) => m.status === "scheduled" && new Date(m.endAt).getTime() >= nowMs);
  const past = meetings.filter((m) => !(m.status === "scheduled" && new Date(m.endAt).getTime() >= nowMs));

  return (
    <PlannerShell>
      <div className="tpNarrow" style={{ maxWidth: 920 }}>
        <AdminBar />
        {error && <div className="tpEmpty" role="alert">{error}</div>}
        {!error && (
          <>
            <p className="kicker">Admin</p>
            <h1 className="serif tpH1" style={{ marginBottom: "1rem" }}>Meetings</h1>

            {provider !== "google" && (
              <div className="tpEmpty" style={{ marginBottom: "1.2rem" }}>
                <strong style={{ color: "var(--gold-light)" }}>Google Calendar isn&apos;t connected.</strong> Meetings are saved here but won&apos;t
                appear on a real calendar or send invites. Set <code>GOOGLE_CALENDAR_CLIENT_EMAIL</code>, <code>GOOGLE_CALENDAR_PRIVATE_KEY</code>,
                and <code>GOOGLE_CALENDAR_ID</code> in <code>.env</code> (see <code>.env.example</code> for setup steps) to sync automatically.
              </div>
            )}

            <ScheduleForm onSaved={load} />

            <h2 className="serif" style={{ color: "var(--white)", fontSize: "1.1rem", marginBottom: "0.6rem" }}>Upcoming ({upcoming.length})</h2>
            {upcoming.length === 0 && <div className="tpEmpty">No upcoming meetings.</div>}
            {upcoming.map((m) => (
              <div key={m.id} className="tpItem">
                <div className="tpItemBody" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div>
                    <div className="tpItemName">{m.title} — {m.customerName}</div>
                    <div className="tpItemMeta">
                      <span>{new Date(m.startAt).toLocaleString()}</span>
                      <span>{Math.round((new Date(m.endAt).getTime() - new Date(m.startAt).getTime()) / 60000)} min</span>
                      {m.email && <span>{m.email}</span>}
                      {m.phone && <span>{m.phone}</span>}
                      <span className={`tpBadge ${m.calendarProvider === "google" ? "" : "tpBadgeDev"}`}>
                        {m.calendarProvider === "google" ? "Synced to Google Calendar" : "Not synced (dev mode)"}
                      </span>
                    </div>
                    {m.notes && <p className="tpMuted" style={{ fontSize: "0.8rem", marginTop: 4 }}>{m.notes}</p>}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {m.calendarEventLink && <a className="tpBtn tpBtnSm" href={m.calendarEventLink} target="_blank" rel="noopener noreferrer">Open event</a>}
                    <button className="tpBtn tpBtnSm" onClick={() => cancel(m.id)}>Cancel</button>
                    <button className="tpBtn tpBtnSm tpBtnDanger" onClick={() => remove(m.id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}

            {past.length > 0 && (
              <>
                <h2 className="serif" style={{ color: "var(--white)", fontSize: "1.1rem", margin: "1.4rem 0 0.6rem" }}>Past / cancelled ({past.length})</h2>
                {past.map((m) => (
                  <div key={m.id} className="tpItem" style={{ opacity: 0.65 }}>
                    <div className="tpItemBody" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <div>
                        <div className="tpItemName">{m.title} — {m.customerName} <span className="tpBadge">{m.status}</span></div>
                        <div className="tpItemMeta"><span>{new Date(m.startAt).toLocaleString()}</span></div>
                      </div>
                      <button className="tpBtn tpBtnSm tpBtnDanger" onClick={() => remove(m.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </PlannerShell>
  );
}
