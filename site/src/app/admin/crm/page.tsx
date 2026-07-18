"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "../../trips/planner.css";
import PlannerShell from "@/components/planner/PlannerShell";
import AdminBar from "@/components/planner/AdminBar";
import { api, jpost, ApiError } from "@/lib/tp-client";

interface Lead {
  id: string;
  source: "enquiry" | "quote" | "meeting";
  name: string;
  email: string | null;
  phone: string | null;
  subject: string;
  status: string;
  createdAt: string;
}

interface EnquiryDetail {
  id: string; name: string; email: string; mobile: string; service: string; destination: string | null;
  departure: string | null; travelDate: string | null; travellers: string | null; contactMethod: string | null;
  notes: string | null; status: string; adminNotes: string | null; createdAt: string;
}

const SOURCE_LABEL: Record<Lead["source"], string> = { enquiry: "Enquiry", quote: "Quote", meeting: "Meeting" };
const SOURCE_LABEL_PLURAL: Record<Lead["source"], string> = { enquiry: "Enquiries", quote: "Quotes", meeting: "Meetings" };
const ENQUIRY_STATUSES = ["new", "contacted", "qualified", "converted", "lost"];
const SOURCES: (Lead["source"] | "all")[] = ["all", "enquiry", "quote", "meeting"];

export default function CrmPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [sel, setSel] = useState<EnquiryDetail | null>(null);
  const [selLead, setSelLead] = useState<Lead | null>(null);
  const [sourceFilter, setSourceFilter] = useState<Lead["source"] | "all">("all");
  const [error, setError] = useState<string | null>(null);

  const onError = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) { router.push("/admin/login"); return; }
    setError(e instanceof Error ? e.message : "Failed");
  }, [router]);

  const load = useCallback(() => {
    api<{ leads: Lead[] }>("/api/tp/admin/crm")
      .then((d) => setLeads(d.leads))
      .catch(onError);
  }, [onError]);
  useEffect(load, [load]);

  const open = (lead: Lead) => {
    setSelLead(lead);
    if (lead.source !== "enquiry") { setSel(null); return; }
    api<{ enquiry: EnquiryDetail }>(`/api/tp/admin/crm?id=${lead.id}`).then((d) => setSel(d.enquiry)).catch(onError);
  };

  const setStatus = async (id: string, status: string) => {
    await jpost("/api/tp/admin/crm", { id, status }, "PATCH");
    load();
    if (sel?.id === id) open({ ...selLead!, id, source: "enquiry" });
  };

  const saveNotes = async (id: string, status: string, adminNotes: string) => {
    await jpost("/api/tp/admin/crm", { id, status, adminNotes }, "PATCH");
    load();
  };

  const filtered = useMemo(
    () => (leads ?? []).filter((l) => sourceFilter === "all" || l.source === sourceFilter),
    [leads, sourceFilter]
  );

  const counts = useMemo(() => {
    const c = { total: (leads ?? []).length, enquiry: 0, quote: 0, meeting: 0, newEnquiries: 0 };
    for (const l of leads ?? []) {
      c[l.source]++;
      if (l.source === "enquiry" && l.status === "new") c.newEnquiries++;
    }
    return c;
  }, [leads]);

  return (
    <PlannerShell>
      <div className="tpWrap">
        <AdminBar />
        {error && <div className="tpEmpty" role="alert">{error}</div>}
        {!error && (
          <>
            <p className="kicker">Admin</p>
            <h1 className="serif tpH1" style={{ marginBottom: "0.6rem" }}>CRM</h1>
            <p className="tpMuted" style={{ marginBottom: "1rem" }}>
              Every lead in one place — homepage enquiries, trip-planner quote requests, and scheduled meetings.
            </p>

            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              <div className="tpCard" style={{ padding: "0.6rem 1rem" }}>
                <div className="tpMuted" style={{ fontSize: "0.72rem" }}>Total leads</div>
                <div className="serif" style={{ fontSize: "1.4rem", color: "var(--white)" }}>{counts.total}</div>
              </div>
              <div className="tpCard" style={{ padding: "0.6rem 1rem" }}>
                <div className="tpMuted" style={{ fontSize: "0.72rem" }}>New enquiries (need follow-up)</div>
                <div className="serif" style={{ fontSize: "1.4rem", color: "var(--gold-light)" }}>{counts.newEnquiries}</div>
              </div>
            </div>

            <nav style={{ display: "flex", gap: 6, marginBottom: "1rem", flexWrap: "wrap" }}>
              {SOURCES.map((s) => (
                <button
                  key={s}
                  className={`tpBtn tpBtnSm ${sourceFilter === s ? "tpBtnGold" : ""}`}
                  onClick={() => setSourceFilter(s)}
                >
                  {s === "all" ? `All (${counts.total})` : `${SOURCE_LABEL_PLURAL[s]} (${counts[s]})`}
                </button>
              ))}
            </nav>

            <div style={{ display: "grid", gridTemplateColumns: sel || selLead ? "1fr 1.2fr" : "1fr", gap: "1rem", alignItems: "start" }}>
              <div>
                {leads === null && <div className="tpSkeleton" />}
                {filtered.length === 0 && leads !== null && <div className="tpEmpty">No leads yet.</div>}
                {filtered.length > 0 && (
                  <table className="tpTable">
                    <thead><tr><th>Source</th><th>Name</th><th>Subject</th><th>Status</th><th>Date</th></tr></thead>
                    <tbody>
                      {filtered.map((l) => (
                        <tr
                          key={`${l.source}-${l.id}`}
                          onClick={() => open(l)}
                          style={{ cursor: "pointer", background: selLead?.id === l.id && selLead.source === l.source ? "rgba(75,49,148,0.25)" : "transparent" }}
                        >
                          <td><span className="tpBadge">{SOURCE_LABEL[l.source]}</span></td>
                          <td>{l.name}<div className="tpMuted" style={{ fontSize: "0.72rem" }}>{l.email ?? l.phone ?? ""}</div></td>
                          <td>{l.subject}</td>
                          <td><span className="tpBadge">{l.status}</span></td>
                          <td className="tpMuted">{new Date(l.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {selLead && selLead.source !== "enquiry" && (
                <div className="tpCard">
                  <h2 className="serif" style={{ color: "var(--white)", marginBottom: "0.6rem" }}>{selLead.name}</h2>
                  <p className="tpMuted">{selLead.subject} · <span className="tpBadge">{selLead.status}</span></p>
                  <p className="tpMuted" style={{ marginTop: 4 }}>{selLead.email ?? ""} {selLead.phone ? `· ${selLead.phone}` : ""}</p>
                  <p style={{ marginTop: "1rem" }}>
                    <Link className="tpBtn tpBtnGold" href={selLead.source === "quote" ? "/admin/trip-enquiries" : "/admin/meetings"}>
                      Open full {selLead.source === "quote" ? "quote enquiry" : "meeting"} record →
                    </Link>
                  </p>
                </div>
              )}

              {sel && selLead?.source === "enquiry" && (
                <EnquiryEditor
                  key={sel.id}
                  enquiry={sel}
                  onStatus={(status) => setStatus(sel.id, status)}
                  onSaveNotes={(status, notes) => saveNotes(sel.id, status, notes)}
                />
              )}
            </div>
          </>
        )}
      </div>
    </PlannerShell>
  );
}

function EnquiryEditor({
  enquiry, onStatus, onSaveNotes,
}: { enquiry: EnquiryDetail; onStatus: (status: string) => void; onSaveNotes: (status: string, notes: string) => void }) {
  const [notes, setNotes] = useState(enquiry.adminNotes ?? "");
  const [saved, setSaved] = useState(false);

  return (
    <div className="tpCard">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
        <h2 className="serif" style={{ color: "var(--white)" }}>{enquiry.name}</h2>
        <select
          value={enquiry.status}
          onChange={(e) => onStatus(e.target.value)}
          style={{ minHeight: 38, background: "rgba(3,6,17,0.6)", border: "1px solid rgba(115,85,216,0.4)", borderRadius: 8, color: "var(--ivory)", padding: "0 0.6rem" }}
        >
          {ENQUIRY_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <p className="tpMuted">
        <strong style={{ color: "var(--ivory)" }}>{enquiry.email}</strong> · {enquiry.mobile}
        {enquiry.contactMethod ? ` · prefers ${enquiry.contactMethod}` : ""}
      </p>
      <p className="tpMuted" style={{ marginTop: 4 }}>
        Interested in: <strong style={{ color: "var(--ivory)" }}>{enquiry.service}</strong>
        {enquiry.destination ? ` · ${enquiry.destination}` : ""}
        {enquiry.departure ? ` · from ${enquiry.departure}` : ""}
        {enquiry.travelDate ? ` · ${enquiry.travelDate}` : ""}
        {enquiry.travellers ? ` · ${enquiry.travellers} travellers` : ""}
      </p>
      {enquiry.notes && <p className="tpMuted" style={{ marginTop: 8 }}>&ldquo;{enquiry.notes}&rdquo;</p>}

      <div className="tpField" style={{ marginTop: "1rem" }}>
        <label>Admin notes</label>
        <textarea rows={4} value={notes} onChange={(e) => { setNotes(e.target.value); setSaved(false); }} placeholder="Follow-up notes, call summary, next steps…" />
      </div>
      <button
        className="tpBtn tpBtnGold"
        onClick={() => { onSaveNotes(enquiry.status, notes); setSaved(true); }}
      >
        Save notes
      </button>
      {saved && <span className="tpMuted" style={{ marginInlineStart: 8, fontSize: "0.8rem" }}>Saved.</span>}
    </div>
  );
}
