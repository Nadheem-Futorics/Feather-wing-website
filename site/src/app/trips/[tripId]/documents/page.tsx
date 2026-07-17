"use client";

import { use, useCallback, useEffect, useState } from "react";
import "../../planner.css";
import PlannerShell from "@/components/planner/PlannerShell";
import { useLang } from "@/lib/i18n";
import { tp } from "@/lib/tp-i18n";
import { api, jpost } from "@/lib/tp-client";

interface Doc { id: string; fileName: string; mime: string; size: number; kind: string; url: string; createdAt: string }
interface Reservation { id: string; type: string; provider: string | null; confirmationNumber: string | null; startAt: string | null; location: string | null; price: number | null; currency: string | null; status: string }

export default function DocumentsPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const { t } = useLang();
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resForm, setResForm] = useState({ type: "hotel", provider: "", confirmationNumber: "", startAt: "", location: "" });

  const load = useCallback(() => {
    api<{ documents: Doc[] }>(`/api/tp/trips/${tripId}/documents`).then((d) => setDocs(d.documents)).catch((e) => setErr(e.message));
    api<{ reservations: Reservation[] }>(`/api/tp/trips/${tripId}/reservations`).then((d) => setReservations(d.reservations));
  }, [tripId]);
  useEffect(load, [load]);

  async function upload(file: File) {
    setUploading(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", file.type === "application/pdf" ? "voucher" : "ticket");
      const res = await fetch(`/api/tp/trips/${tripId}/documents`, { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.message ?? "Upload failed");
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <PlannerShell tripId={tripId}>
      <div className="tpNarrow">
        <p className="kicker">{t(tp.planner.documents)}</p>
        <h1 className="serif tpH1" style={{ marginBottom: "0.4rem" }}>{t(tp.planner.documents)}</h1>
        <p className="tpMuted">{t(tp.docs.sensitiveNote)}</p>

        <div className="tpCard" style={{ marginBlock: "1rem" }}>
          <label className="tpBtn tpBtnGold" style={{ cursor: "pointer" }}>
            {uploading ? "…" : `⬆ ${t(tp.docs.upload)}`}
            <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} disabled={uploading} />
          </label>
          <span className="tpMuted" style={{ marginInlineStart: 10, fontSize: "0.75rem" }}>{t(tp.docs.types)}</span>
          {err && <p className="tpErr" role="alert" style={{ marginTop: 8 }}>{err}</p>}
        </div>

        {docs === null && <div className="tpSkeleton" />}
        {docs?.length === 0 && <div className="tpEmpty">{t(tp.docs.empty)}</div>}
        {docs?.map((d) => (
          <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
            <div className="tpItem">
              <div className="tpItemBody">
                <div className="tpItemName">{d.mime === "application/pdf" ? "📄" : "🖼"} {d.fileName}</div>
                <div className="tpItemMeta"><span>{(d.size / 1024).toFixed(0)} KB</span><span>{d.kind}</span></div>
              </div>
            </div>
          </a>
        ))}

        <h2 className="serif" style={{ color: "var(--white)", fontSize: "1.25rem", marginBlock: "1.6rem 0.7rem" }}>{t(tp.docs.reservations)}</h2>
        <form
          className="tpCard"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: "0.5rem", alignItems: "end", marginBottom: "1rem" }}
          onSubmit={async (e) => {
            e.preventDefault();
            await jpost(`/api/tp/trips/${tripId}/reservations`, {
              type: resForm.type, provider: resForm.provider || undefined, confirmationNumber: resForm.confirmationNumber || undefined,
              startAt: resForm.startAt || undefined, location: resForm.location || undefined,
            });
            setResForm({ type: "hotel", provider: "", confirmationNumber: "", startAt: "", location: "" });
            load();
          }}
        >
          <div className="tpField" style={{ margin: 0 }}>
            <label htmlFor="r-type">{t({ en: "Type", ar: "النوع" })}</label>
            <select id="r-type" value={resForm.type} onChange={(e) => setResForm({ ...resForm, type: e.target.value })}>
              {["flight", "hotel", "train", "bus", "car", "transfer", "restaurant", "activity", "package", "other"].map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div className="tpField" style={{ margin: 0 }}>
            <label htmlFor="r-prov">{t({ en: "Provider", ar: "المزود" })}</label>
            <input id="r-prov" value={resForm.provider} onChange={(e) => setResForm({ ...resForm, provider: e.target.value })} />
          </div>
          <div className="tpField" style={{ margin: 0 }}>
            <label htmlFor="r-conf">{t({ en: "Confirmation #", ar: "رقم التأكيد" })}</label>
            <input id="r-conf" value={resForm.confirmationNumber} onChange={(e) => setResForm({ ...resForm, confirmationNumber: e.target.value })} />
          </div>
          <div className="tpField" style={{ margin: 0 }}>
            <label htmlFor="r-start">{t({ en: "Date/time", ar: "التاريخ/الوقت" })}</label>
            <input id="r-start" type="datetime-local" value={resForm.startAt} onChange={(e) => setResForm({ ...resForm, startAt: e.target.value })} />
          </div>
          <button className="tpBtn tpBtnGold" type="submit">+</button>
        </form>

        {reservations.map((r) => (
          <div key={r.id} className="tpItem">
            <div className="tpItemBody">
              <div className="tpItemName">
                {{ flight: "✈", hotel: "🏨", train: "🚆", bus: "🚌", car: "🚗", transfer: "🚐", restaurant: "🍽", activity: "🎟", package: "★", other: "📌" }[r.type] ?? "📌"} {r.type}
                {r.provider ? ` — ${r.provider}` : ""}
                <span className="tpBadge">{r.status}</span>
              </div>
              <div className="tpItemMeta">
                {r.confirmationNumber && <span>#{r.confirmationNumber}</span>}
                {r.startAt && <span>{r.startAt.replace("T", " ")}</span>}
                {r.location && <span>{r.location}</span>}
              </div>
              <div className="tpItemActions">
                <button
                  className="tpBtn tpBtnSm tpBtnDanger"
                  onClick={async () => {
                    await api(`/api/tp/trips/${tripId}/reservations`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reservationId: r.id }) });
                    load();
                  }}
                >
                  {t(tp.planner.remove)}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PlannerShell>
  );
}
