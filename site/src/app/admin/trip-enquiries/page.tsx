"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "../../trips/planner.css";
import PlannerShell from "@/components/planner/PlannerShell";
import AdminBar from "@/components/planner/AdminBar";
import { api, jpost, ApiError } from "@/lib/tp-client";

interface Row { id: string; reference: string; customerName: string; email: string; travelers: number | null; budget: number | null; currency: string | null; status: string; createdAt: string }
interface Detail extends Row {
  phone: string | null; whatsapp: string | null; contactMethod: string | null; departureCity: string | null;
  datesFlexible: boolean; accommodation: string | null; needsFlights: boolean; needsVisa: boolean;
  needsInsurance: boolean; needsTransfer: boolean; notes: string | null; adminNotes: string | null;
  tripSummary: {
    destinations?: string[]; dates?: { start: string | null; end: string | null };
    travelers?: { adults: number; children: number };
    days?: { day: number; date: string | null; destination: string | null; items: { name: string; category: string; time: string | null; cost: number | null }[] }[];
    packages?: string[]; estimatedActivityCosts?: number; specialRequirements?: string[];
  } | null;
}

export default function AdminEnquiriesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [sel, setSel] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onError = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) { router.push("/admin/login"); return; }
    setError(e instanceof Error ? e.message : "Failed");
  }, [router]);

  const load = useCallback(() => {
    api<{ enquiries: Row[] }>("/api/tp/admin/enquiries")
      .then((d) => setRows(d.enquiries))
      .catch(onError);
  }, [onError]);
  useEffect(load, [load]);

  const open = (id: string) =>
    api<{ enquiry: Detail }>(`/api/tp/admin/enquiries?id=${id}`).then((d) => setSel(d.enquiry)).catch(onError);

  const setStatus = async (id: string, status: string) => {
    await jpost("/api/tp/admin/enquiries", { id, status }, "PATCH");
    load();
    if (sel?.id === id) open(id);
  };

  return (
    <PlannerShell>
      <div className="tpWrap">
        <AdminBar />
        {error && <div className="tpEmpty" role="alert">{error}</div>}
        {!error && (
          <>
            <p className="kicker">Admin</p>
            <h1 className="serif tpH1" style={{ marginBottom: "1rem" }}>Trip Enquiries</h1>
            <div style={{ display: "grid", gridTemplateColumns: sel ? "1fr 1.2fr" : "1fr", gap: "1rem", alignItems: "start" }}>
              <div>
                {rows === null && <div className="tpSkeleton" />}
                {rows?.length === 0 && <div className="tpEmpty">No enquiries yet.</div>}
                <table className="tpTable">
                  <thead><tr><th>Ref</th><th>Customer</th><th>Budget</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {rows?.map((r) => (
                      <tr key={r.id} onClick={() => open(r.id)} style={{ cursor: "pointer", background: sel?.id === r.id ? "rgba(75,49,148,0.25)" : "transparent" }}>
                        <td style={{ color: "var(--gold-light)" }}>{r.reference}</td>
                        <td>{r.customerName}<div className="tpMuted" style={{ fontSize: "0.72rem" }}>{r.email}</div></td>
                        <td>{r.budget ? `${r.budget} ${r.currency ?? ""}` : "—"}</td>
                        <td><span className="tpBadge">{r.status}</span></td>
                        <td className="tpMuted">{new Date(r.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {sel && (
                <div className="tpCard">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
                    <h2 className="serif" style={{ color: "var(--white)" }}>{sel.reference}</h2>
                    <select value={sel.status} onChange={(e) => setStatus(sel.id, e.target.value)}
                      style={{ minHeight: 38, background: "rgba(3,6,17,0.6)", border: "1px solid rgba(115,85,216,0.4)", borderRadius: 8, color: "var(--ivory)", padding: "0 0.6rem" }}>
                      {["new", "in_progress", "quoted", "closed"].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <p className="tpMuted">
                    <strong style={{ color: "var(--ivory)" }}>{sel.customerName}</strong> · {sel.email}
                    {sel.phone ? ` · ${sel.phone}` : ""}{sel.whatsapp ? ` · WA ${sel.whatsapp}` : ""} · prefers {sel.contactMethod}
                  </p>
                  <p className="tpMuted" style={{ marginTop: 4 }}>
                    {sel.departureCity ? `From ${sel.departureCity} · ` : ""}{sel.travelers ?? "?"} travellers
                    {sel.datesFlexible ? " · flexible dates" : ""} {sel.budget ? `· budget ${sel.budget} ${sel.currency ?? ""}` : ""}
                  </p>
                  <p style={{ marginTop: 6 }}>
                    {sel.needsFlights && <span className="tpBadge" style={{ marginInlineEnd: 4 }}>flights</span>}
                    {sel.needsVisa && <span className="tpBadge" style={{ marginInlineEnd: 4 }}>visa</span>}
                    {sel.needsInsurance && <span className="tpBadge" style={{ marginInlineEnd: 4 }}>insurance</span>}
                    {sel.needsTransfer && <span className="tpBadge" style={{ marginInlineEnd: 4 }}>transfer</span>}
                  </p>
                  {sel.notes && <p className="tpMuted" style={{ marginTop: 8 }}>&ldquo;{sel.notes}&rdquo;</p>}

                  {sel.tripSummary && (
                    <div style={{ marginTop: "1rem" }}>
                      <h3 className="serif" style={{ color: "var(--gold-light)", fontSize: "1rem" }}>
                        {sel.tripSummary.destinations?.join(" · ")}
                        {sel.tripSummary.dates?.start ? ` — ${sel.tripSummary.dates.start} → ${sel.tripSummary.dates.end}` : ""}
                      </h3>
                      {sel.tripSummary.packages && sel.tripSummary.packages.length > 0 && (
                        <p className="tpMuted" style={{ marginTop: 4 }}>Packages: {sel.tripSummary.packages.join(", ")}</p>
                      )}
                      {sel.tripSummary.days?.map((d) => (
                        <div key={d.day} style={{ marginTop: 10 }}>
                          <strong style={{ color: "var(--ivory)", fontSize: "0.85rem" }}>Day {d.day}{d.destination ? ` — ${d.destination}` : ""}{d.date ? ` (${d.date})` : ""}</strong>
                          <ul style={{ paddingInlineStart: "1.2rem", marginTop: 4 }}>
                            {d.items.map((i, x) => (
                              <li key={x} className="tpMuted" style={{ fontSize: "0.82rem" }}>
                                {i.time ? `${i.time} · ` : ""}{i.name} <em>({i.category})</em>{i.cost ? ` — ${i.cost}` : ""}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                      {sel.tripSummary.specialRequirements && sel.tripSummary.specialRequirements.length > 0 && (
                        <p className="tpMuted" style={{ marginTop: 8 }}>Special: {sel.tripSummary.specialRequirements.join(" · ")}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </PlannerShell>
  );
}
