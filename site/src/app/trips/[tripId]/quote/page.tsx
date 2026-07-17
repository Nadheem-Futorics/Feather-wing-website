"use client";

import { use, useState } from "react";
import "../../planner.css";
import PlannerShell from "@/components/planner/PlannerShell";
import { useLang } from "@/lib/i18n";
import { tp } from "@/lib/tp-i18n";
import { jpost, ApiError } from "@/lib/tp-client";
import { contact } from "@/data/site";

export default function QuotePage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const { t } = useLang();
  const [f, setF] = useState({
    customerName: "", email: "", phone: "", whatsapp: "", contactMethod: "whatsapp", departureCity: "",
    travelers: "", datesFlexible: false, budget: "", accommodation: "", needsFlights: true, needsVisa: false,
    needsInsurance: false, needsTransfer: true, notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [done, setDone] = useState<{ reference: string; whatsappUrl: string } | null>(null);

  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrs({});
    try {
      const res = await jpost<{ reference: string; whatsappUrl: string }>(`/api/tp/trips/${tripId}/quote`, {
        customerName: f.customerName.trim(),
        email: f.email.trim(),
        phone: f.phone.trim() || undefined,
        whatsapp: f.whatsapp.trim() || undefined,
        contactMethod: f.contactMethod,
        departureCity: f.departureCity.trim() || undefined,
        travelers: f.travelers ? Number(f.travelers) : undefined,
        datesFlexible: f.datesFlexible,
        budget: f.budget ? Number(f.budget) : undefined,
        accommodation: f.accommodation || undefined,
        needsFlights: f.needsFlights,
        needsVisa: f.needsVisa,
        needsInsurance: f.needsInsurance,
        needsTransfer: f.needsTransfer,
        notes: f.notes.trim() || undefined,
      });
      setDone(res);
    } catch (e) {
      if (e instanceof ApiError && e.issues) {
        const m: Record<string, string> = {};
        for (const i of e.issues) m[i.path] = i.message;
        setErrs(m);
      } else setErrs({ _: e instanceof Error ? e.message : "Failed" });
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <PlannerShell tripId={tripId}>
        <div className="tpNarrow" style={{ textAlign: "center", paddingTop: "4rem" }}>
          <p className="kicker">{t(tp.quote.submitted)}</p>
          <h1 className="serif tpH1" style={{ marginBlock: "0.6rem" }}>✓ {t(tp.quote.submitted)}</h1>
          <p className="tpMuted">{t(tp.quote.reference)}: <strong style={{ color: "var(--gold-light)", fontSize: "1.1rem" }}>{done.reference}</strong></p>
          <p className="tpMuted" style={{ marginTop: 6 }}>{t(tp.quote.summary)} ✓</p>
          <div style={{ display: "flex", gap: "0.8rem", justifyContent: "center", marginTop: "1.6rem", flexWrap: "wrap" }}>
            <a className="btn btn-gold" href={done.whatsappUrl} target="_blank" rel="noopener noreferrer">{t(tp.quote.whatsappCta)}</a>
            <a className="btn btn-ghost" href={`tel:${contact.phone}`}>{t(tp.quote.talkExpert)}</a>
          </div>
        </div>
      </PlannerShell>
    );
  }

  return (
    <PlannerShell tripId={tripId}>
      <div className="tpNarrow" style={{ maxWidth: 640 }}>
        <p className="kicker">{t(tp.planner.quote)}</p>
        <h1 className="serif tpH1" style={{ marginBottom: "0.4rem" }}>{t(tp.quote.title)}</h1>
        <p className="tpMuted" style={{ marginBottom: "1.2rem" }}>{t(tp.quote.intro)} — {t(tp.quote.summary)}.</p>

        <form onSubmit={submit} className="tpCard" style={{ padding: "1.4rem" }}>
          <div className="tpRow">
            <div className="tpField">
              <label htmlFor="q-name">{t({ en: "Full name", ar: "الاسم الكامل" })} *</label>
              <input id="q-name" value={f.customerName} onChange={(e) => set("customerName", e.target.value)} required />
              {errs.customerName && <span className="tpErr">{errs.customerName}</span>}
            </div>
            <div className="tpField">
              <label htmlFor="q-email">{t({ en: "Email", ar: "البريد الإلكتروني" })} *</label>
              <input id="q-email" type="email" dir="ltr" value={f.email} onChange={(e) => set("email", e.target.value)} required />
              {errs.email && <span className="tpErr">{errs.email}</span>}
            </div>
          </div>
          <div className="tpRow">
            <div className="tpField">
              <label htmlFor="q-phone">{t({ en: "Phone", ar: "الهاتف" })}</label>
              <input id="q-phone" type="tel" dir="ltr" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
              {errs.phone && <span className="tpErr">{errs.phone}</span>}
            </div>
            <div className="tpField">
              <label htmlFor="q-wa">WhatsApp</label>
              <input id="q-wa" type="tel" dir="ltr" value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
            </div>
          </div>
          <div className="tpRow">
            <div className="tpField">
              <label htmlFor="q-method">{t({ en: "Preferred contact", ar: "طريقة التواصل" })}</label>
              <select id="q-method" value={f.contactMethod} onChange={(e) => set("contactMethod", e.target.value)}>
                <option value="whatsapp">WhatsApp</option>
                <option value="phone">{t({ en: "Phone", ar: "هاتف" })}</option>
                <option value="email">{t({ en: "Email", ar: "بريد" })}</option>
              </select>
            </div>
            <div className="tpField">
              <label htmlFor="q-dep">{t({ en: "Departure city", ar: "مدينة المغادرة" })}</label>
              <input id="q-dep" value={f.departureCity} onChange={(e) => set("departureCity", e.target.value)} />
            </div>
          </div>
          <div className="tpRow">
            <div className="tpField">
              <label htmlFor="q-trav">{t({ en: "Travellers", ar: "عدد المسافرين" })}</label>
              <input id="q-trav" type="number" min={1} value={f.travelers} onChange={(e) => set("travelers", e.target.value)} />
            </div>
            <div className="tpField">
              <label htmlFor="q-budget">{t({ en: "Budget", ar: "الميزانية" })}</label>
              <input id="q-budget" type="number" min={0} value={f.budget} onChange={(e) => set("budget", e.target.value)} />
            </div>
          </div>
          <div className="tpChips" style={{ marginBottom: "0.9rem" }}>
            {([
              ["datesFlexible", { en: "Dates flexible", ar: "تواريخ مرنة" }],
              ["needsFlights", { en: "Flights", ar: "طيران" }],
              ["needsVisa", { en: "Visa assistance", ar: "مساعدة تأشيرة" }],
              ["needsInsurance", { en: "Insurance", ar: "تأمين" }],
              ["needsTransfer", { en: "Airport transfer", ar: "توصيل مطار" }],
            ] as const).map(([k, label]) => (
              <button key={k} type="button" className="tpChip" aria-pressed={f[k] as boolean} onClick={() => set(k, !f[k])}>
                {t(label)}
              </button>
            ))}
          </div>
          <div className="tpField">
            <label htmlFor="q-notes">{t({ en: "Additional notes", ar: "ملاحظات إضافية" })}</label>
            <textarea id="q-notes" rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          {errs._ && <p className="tpErr" role="alert">{errs._}</p>}
          <button className="tpBtn tpBtnGold" style={{ width: "100%", marginTop: 6 }} disabled={busy} type="submit">
            {busy ? "…" : t(tp.quote.submit)}
          </button>
        </form>
      </div>
    </PlannerShell>
  );
}
