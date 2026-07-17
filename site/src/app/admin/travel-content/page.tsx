"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "../../trips/planner.css";
import PlannerShell from "@/components/planner/PlannerShell";
import AdminBar from "@/components/planner/AdminBar";
import { api, jpost, ApiError } from "@/lib/tp-client";

interface L { en: string; ar: string }
interface TripRow {
  id: string; scene: string; hue: string; title: L; place: L; dates: L; duration: L; price: string; seats: number; category: string; active: boolean;
}
interface OfferRow {
  id: string; scene: string; title: L; subtitle: L; description: L; badge: L; priceFrom: string; cta: L; ctaHref: string; validUntil: string; active: boolean;
}
interface KbRow {
  id: string; category: string; title: L; content: L; active: boolean;
}

const SCENES = ["canyon", "hegra", "dunes", "serene-city", "heritage", "elephant-rock", "istanbul", "maldives", "mountains", "skyline", "sea", "london", "paris", "dubai", "switzerland", "newyork", "japan", "globe"];
const HUES = ["gold", "sand", "aqua", "navy", "green", "violet", "rose"];
const CATS = ["saudi", "international", "islamic", "desert", "group", "corporate"];
const KB_CATS = ["general", "services", "destinations", "booking", "visa", "umrah", "corporate", "policies"];

const field = (label: string, node: React.ReactNode) => (
  <div className="tpField" style={{ margin: 0 }}>
    <label>{label}</label>
    {node}
  </div>
);

function TripForm({ onSaved }: { onSaved: () => void }) {
  const empty = { scene: "canyon", hue: "sand", titleEn: "", titleAr: "", placeEn: "", placeAr: "", datesEn: "", datesAr: "", durationEn: "", durationAr: "", price: "SAR —", seats: 0, category: "saudi" };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));
  return (
    <form
      className="tpCard"
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem", marginBottom: "1.4rem" }}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true); setErr(null);
        try {
          await jpost("/api/tp/admin/content", { kind: "trip", data: { ...f, seats: Number(f.seats) } });
          setF(empty); onSaved();
        } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
      }}
    >
      <h3 className="serif" style={{ gridColumn: "1 / -1", color: "var(--white)" }}>Add a featured trip</h3>
      {field("Title (EN)", <input value={f.titleEn} onChange={(e) => set("titleEn", e.target.value)} required />)}
      {field("Title (AR)", <input value={f.titleAr} onChange={(e) => set("titleAr", e.target.value)} dir="rtl" required />)}
      {field("Place (EN)", <input value={f.placeEn} onChange={(e) => set("placeEn", e.target.value)} required />)}
      {field("Place (AR)", <input value={f.placeAr} onChange={(e) => set("placeAr", e.target.value)} dir="rtl" required />)}
      {field("Dates (EN)", <input value={f.datesEn} onChange={(e) => set("datesEn", e.target.value)} />)}
      {field("Dates (AR)", <input value={f.datesAr} onChange={(e) => set("datesAr", e.target.value)} dir="rtl" />)}
      {field("Duration (EN)", <input value={f.durationEn} onChange={(e) => set("durationEn", e.target.value)} placeholder="4 days" />)}
      {field("Duration (AR)", <input value={f.durationAr} onChange={(e) => set("durationAr", e.target.value)} dir="rtl" placeholder="٤ أيام" />)}
      {field("Price", <input value={f.price} onChange={(e) => set("price", e.target.value)} placeholder="SAR 3,900" />)}
      {field("Seats left", <input type="number" min={0} value={f.seats} onChange={(e) => set("seats", e.target.value)} />)}
      {field("Category", <select value={f.category} onChange={(e) => set("category", e.target.value)}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>)}
      {field("Image scene", <select value={f.scene} onChange={(e) => set("scene", e.target.value)}>{SCENES.map((s) => <option key={s}>{s}</option>)}</select>)}
      {field("Accent hue", <select value={f.hue} onChange={(e) => set("hue", e.target.value)}>{HUES.map((h) => <option key={h}>{h}</option>)}</select>)}
      {err && <p className="tpErr" style={{ gridColumn: "1 / -1" }}>{err}</p>}
      <button className="tpBtn tpBtnGold" disabled={busy} type="submit" style={{ gridColumn: "1 / -1" }}>{busy ? "…" : "Add trip"}</button>
    </form>
  );
}

function OfferForm({ onSaved }: { onSaved: () => void }) {
  const empty = { scene: "dunes", titleEn: "", titleAr: "", subtitleEn: "", subtitleAr: "", descriptionEn: "", descriptionAr: "", badgeEn: "Limited offer", badgeAr: "عرض محدود", priceFrom: "SAR —", ctaEn: "Enquire now", ctaAr: "استفسر الآن", ctaHref: "#enquiry", validUntil: "" };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));
  return (
    <form
      className="tpCard"
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem", marginBottom: "1.4rem" }}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true); setErr(null);
        try {
          await jpost("/api/tp/admin/content", { kind: "offer", data: f });
          setF(empty); onSaved();
        } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
      }}
    >
      <h3 className="serif" style={{ gridColumn: "1 / -1", color: "var(--white)" }}>Add an offer</h3>
      {field("Title (EN)", <input value={f.titleEn} onChange={(e) => set("titleEn", e.target.value)} required />)}
      {field("Title (AR)", <input value={f.titleAr} onChange={(e) => set("titleAr", e.target.value)} dir="rtl" required />)}
      {field("Subtitle (EN)", <input value={f.subtitleEn} onChange={(e) => set("subtitleEn", e.target.value)} />)}
      {field("Subtitle (AR)", <input value={f.subtitleAr} onChange={(e) => set("subtitleAr", e.target.value)} dir="rtl" />)}
      <div className="tpField" style={{ margin: 0, gridColumn: "1 / -1" }}><label>Description (EN)</label><textarea rows={2} value={f.descriptionEn} onChange={(e) => set("descriptionEn", e.target.value)} /></div>
      <div className="tpField" style={{ margin: 0, gridColumn: "1 / -1" }}><label>Description (AR)</label><textarea rows={2} dir="rtl" value={f.descriptionAr} onChange={(e) => set("descriptionAr", e.target.value)} /></div>
      {field("Badge (EN)", <input value={f.badgeEn} onChange={(e) => set("badgeEn", e.target.value)} />)}
      {field("Badge (AR)", <input value={f.badgeAr} onChange={(e) => set("badgeAr", e.target.value)} dir="rtl" />)}
      {field("Price from", <input value={f.priceFrom} onChange={(e) => set("priceFrom", e.target.value)} />)}
      {field("Valid until", <input value={f.validUntil} onChange={(e) => set("validUntil", e.target.value)} placeholder="31 Dec 2026" />)}
      {field("CTA label (EN)", <input value={f.ctaEn} onChange={(e) => set("ctaEn", e.target.value)} />)}
      {field("CTA label (AR)", <input value={f.ctaAr} onChange={(e) => set("ctaAr", e.target.value)} dir="rtl" />)}
      {field("CTA link", <input value={f.ctaHref} onChange={(e) => set("ctaHref", e.target.value)} placeholder="#enquiry" />)}
      {field("Image scene", <select value={f.scene} onChange={(e) => set("scene", e.target.value)}>{SCENES.map((s) => <option key={s}>{s}</option>)}</select>)}
      {err && <p className="tpErr" style={{ gridColumn: "1 / -1" }}>{err}</p>}
      <button className="tpBtn tpBtnGold" disabled={busy} type="submit" style={{ gridColumn: "1 / -1" }}>{busy ? "…" : "Add offer"}</button>
    </form>
  );
}

function KbForm({ onSaved }: { onSaved: () => void }) {
  const empty = { category: "general", titleEn: "", titleAr: "", contentEn: "", contentAr: "" };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));
  return (
    <form
      className="tpCard"
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem", marginBottom: "1.4rem" }}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true); setErr(null);
        try {
          await jpost("/api/tp/admin/content", { kind: "kb", data: f });
          setF(empty); onSaved();
        } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
      }}
    >
      <h3 className="serif" style={{ gridColumn: "1 / -1", color: "var(--white)" }}>Add a knowledge base article</h3>
      <p className="tpMuted" style={{ gridColumn: "1 / -1", marginTop: -6 }}>
        Answers the concierge AI chat widget can draw on directly — write the title as the question and the content as the answer.
      </p>
      {field("Category", <select value={f.category} onChange={(e) => set("category", e.target.value)}>{KB_CATS.map((c) => <option key={c}>{c}</option>)}</select>)}
      <div />
      {field("Title / question (EN)", <input value={f.titleEn} onChange={(e) => set("titleEn", e.target.value)} placeholder="Do you help with visa applications?" required />)}
      {field("Title / question (AR)", <input value={f.titleAr} onChange={(e) => set("titleAr", e.target.value)} dir="rtl" required />)}
      <div className="tpField" style={{ margin: 0, gridColumn: "1 / -1" }}>
        <label>Content / answer (EN)</label>
        <textarea rows={4} value={f.contentEn} onChange={(e) => set("contentEn", e.target.value)} required />
      </div>
      <div className="tpField" style={{ margin: 0, gridColumn: "1 / -1" }}>
        <label>Content / answer (AR)</label>
        <textarea rows={4} dir="rtl" value={f.contentAr} onChange={(e) => set("contentAr", e.target.value)} required />
      </div>
      {err && <p className="tpErr" style={{ gridColumn: "1 / -1" }}>{err}</p>}
      <button className="tpBtn tpBtnGold" disabled={busy} type="submit" style={{ gridColumn: "1 / -1" }}>{busy ? "…" : "Add article"}</button>
    </form>
  );
}

export default function TravelContentPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"trips" | "offers" | "kb">("trips");
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [kb, setKb] = useState<KbRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onError = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) { router.push("/admin/login"); return; }
    setError(e instanceof Error ? e.message : "Failed");
  }, [router]);

  const load = useCallback(() => {
    api<{ trips: TripRow[]; offers: OfferRow[]; kb: KbRow[] }>("/api/tp/admin/content")
      .then((d) => { setTrips(d.trips); setOffers(d.offers); setKb(d.kb); })
      .catch(onError);
  }, [onError]);
  useEffect(load, [load]);

  const mutate = async (body: unknown, method: "PATCH" | "DELETE") => {
    await jpost("/api/tp/admin/content", body, method);
    load();
  };

  return (
    <PlannerShell>
      <div className="tpNarrow" style={{ maxWidth: 920 }}>
        <AdminBar />
        {error && <div className="tpEmpty" role="alert">{error}</div>}
        {!error && (
          <>
            <p className="kicker">Admin</p>
            <h1 className="serif tpH1" style={{ marginBottom: "1rem" }}>Travel Content</h1>
            <div className="tpTabs" style={{ display: "flex", gap: "0.4rem", marginBottom: "1.2rem", flexWrap: "wrap" }}>
              <button className={`tpBtn ${tab === "trips" ? "tpBtnGold" : ""}`} onClick={() => setTab("trips")}>Featured Trips ({trips.length})</button>
              <button className={`tpBtn ${tab === "offers" ? "tpBtnGold" : ""}`} onClick={() => setTab("offers")}>Offers ({offers.length})</button>
              <button className={`tpBtn ${tab === "kb" ? "tpBtnGold" : ""}`} onClick={() => setTab("kb")}>Knowledge Base ({kb.length})</button>
            </div>

            {tab === "trips" && (
              <>
                <TripForm onSaved={load} />
                {trips.map((tr) => (
                  <div key={tr.id} className="tpItem">
                    <div className="tpItemBody" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <div>
                        <div className="tpItemName">{tr.title.en} {!tr.active && <span className="tpBadge tpBadgeDev">hidden</span>}</div>
                        <div className="tpItemMeta"><span>{tr.place.en}</span><span>{tr.category}</span><span>{tr.price}</span><span>{tr.seats} seats</span></div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="tpBtn tpBtnSm" onClick={() => mutate({ kind: "trip", id: tr.id, data: { active: !tr.active } }, "PATCH")}>{tr.active ? "Hide" : "Show"}</button>
                        <button className="tpBtn tpBtnSm tpBtnDanger" onClick={() => mutate({ kind: "trip", id: tr.id }, "DELETE")}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {tab === "offers" && (
              <>
                <OfferForm onSaved={load} />
                {offers.length === 0 && <div className="tpEmpty">No offers yet. The first active offer appears on the homepage.</div>}
                {offers.map((o) => (
                  <div key={o.id} className="tpItem">
                    <div className="tpItemBody" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <div>
                        <div className="tpItemName">{o.title.en} {!o.active && <span className="tpBadge tpBadgeDev">hidden</span>}</div>
                        <div className="tpItemMeta"><span>{o.subtitle.en}</span><span>{o.priceFrom}</span>{o.validUntil && <span>{o.validUntil}</span>}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="tpBtn tpBtnSm" onClick={() => mutate({ kind: "offer", id: o.id, data: { active: !o.active } }, "PATCH")}>{o.active ? "Hide" : "Show"}</button>
                        <button className="tpBtn tpBtnSm tpBtnDanger" onClick={() => mutate({ kind: "offer", id: o.id }, "DELETE")}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
                <p className="tpMuted" style={{ fontSize: "0.75rem", marginTop: "0.8rem" }}>Only the first active offer is shown on the homepage. Reorder by hiding others.</p>
              </>
            )}

            {tab === "kb" && (
              <>
                <KbForm onSaved={load} />
                {kb.length === 0 && <div className="tpEmpty">No articles yet. The concierge chat widget answers only from services/destinations/packages until you add some.</div>}
                {kb.map((a) => (
                  <div key={a.id} className="tpItem">
                    <div className="tpItemBody" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                      <div>
                        <div className="tpItemName">{a.title.en} {!a.active && <span className="tpBadge tpBadgeDev">hidden</span>}</div>
                        <div className="tpItemMeta"><span>{a.category}</span></div>
                        <p className="tpMuted" style={{ fontSize: "0.8rem", marginTop: 4, maxWidth: 560 }}>{a.content.en}</p>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button className="tpBtn tpBtnSm" onClick={() => mutate({ kind: "kb", id: a.id, data: { active: !a.active } }, "PATCH")}>{a.active ? "Hide" : "Show"}</button>
                        <button className="tpBtn tpBtnSm tpBtnDanger" onClick={() => mutate({ kind: "kb", id: a.id }, "DELETE")}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
                <p className="tpMuted" style={{ fontSize: "0.75rem", marginTop: "0.8rem" }}>Only active articles are visible to the concierge AI. Hidden articles are kept but ignored.</p>
              </>
            )}
          </>
        )}
      </div>
    </PlannerShell>
  );
}
