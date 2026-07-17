"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import "../planner.css";
import PlannerShell from "@/components/planner/PlannerShell";
import { useLang } from "@/lib/i18n";
import { tp } from "@/lib/tp-i18n";
import { jpost, ApiError, type TripDto } from "@/lib/tp-client";

interface Draft {
  name: string; origin: string; destinations: { name: string }[]; startDate: string; endDate: string;
  adults: number; children: number; childAges: string; partyType: string; currency: string;
  budgetTotal: string; budgetPerPerson: boolean; accommodationLevel: string; pace: string;
  interests: string[]; transportPrefs: string[]; dietary: string; accessibility: string;
  dayStart: string; dayEnd: string; notes: string;
}

const empty: Draft = {
  name: "", origin: "", destinations: [{ name: "" }], startDate: "", endDate: "", adults: 2, children: 0,
  childAges: "", partyType: "family", currency: "SAR", budgetTotal: "", budgetPerPerson: false,
  accommodationLevel: "", pace: "balanced", interests: [], transportPrefs: [], dietary: "", accessibility: "",
  dayStart: "09:00", dayEnd: "21:00", notes: "",
};

const DRAFT_KEY = "fwt-trip-draft";

export default function NewTripPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(empty);
  const [restored, setRestored] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Persist the draft so a partially completed trip is never lost.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        queueMicrotask(() => {
          setD({ ...empty, ...parsed });
          setRestored(true);
        });
      }
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch {}
  }, [d]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const toggle = (k: "interests" | "transportPrefs", v: string) =>
    setD((p) => ({ ...p, [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v] }));

  const steps = [t(tp.wizard.basics), t(tp.wizard.travellers), t(tp.wizard.style), t(tp.wizard.prefs)];

  const validStep = useMemo(() => {
    if (step === 0) return d.name.trim().length >= 2 && d.destinations.some((x) => x.name.trim().length >= 2);
    return true;
  }, [step, d]);

  async function submit() {
    setBusy(true);
    setErrors({});
    try {
      const payload = {
        name: d.name.trim(),
        origin: d.origin.trim() || undefined,
        destinations: d.destinations.filter((x) => x.name.trim()).map((x) => ({ name: x.name.trim() })),
        startDate: d.startDate || undefined,
        endDate: d.endDate || undefined,
        adults: d.adults,
        children: d.children,
        childAges: d.childAges ? d.childAges.split(/[,،\s]+/).map(Number).filter((n) => !Number.isNaN(n)) : undefined,
        partyType: d.partyType,
        currency: d.currency,
        budgetTotal: d.budgetTotal ? Number(d.budgetTotal) : undefined,
        budgetPerPerson: d.budgetPerPerson,
        accommodationLevel: d.accommodationLevel || undefined,
        pace: d.pace,
        interests: d.interests,
        transportPrefs: d.transportPrefs,
        dietary: d.dietary || undefined,
        accessibility: d.accessibility || undefined,
        dayStart: d.dayStart,
        dayEnd: d.dayEnd,
        notes: d.notes || undefined,
      };
      const res = await jpost<{ trip: TripDto }>("/api/tp/trips", payload);
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      router.push(`/trips/${res.trip.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.issues) {
        const map: Record<string, string> = {};
        for (const i of e.issues) map[i.path.split(".")[0]] = i.message;
        setErrors(map);
      } else {
        setErrors({ _: e instanceof Error ? e.message : "Failed" });
      }
      setBusy(false);
    }
  }

  const interestKeys = Object.keys(tp.wizard.interest) as (keyof typeof tp.wizard.interest)[];
  const modeKeys = Object.keys(tp.wizard.modes) as (keyof typeof tp.wizard.modes)[];
  const partyKeys = Object.keys(tp.wizard.party) as (keyof typeof tp.wizard.party)[];

  return (
    <PlannerShell>
      <div className="tpNarrow" style={{ maxWidth: 700 }}>
        <p className="kicker">{t(tp.newTrip)}</p>
        <h1 className="serif tpH1" style={{ marginBottom: 4 }}>{steps[step]}</h1>
        <p className="tpMuted" role="status">
          {t(tp.wizard.step)} {(step + 1).toLocaleString(lang === "ar" ? "ar" : "en")} {t(tp.wizard.of)} {steps.length.toLocaleString(lang === "ar" ? "ar" : "en")} — {t(tp.wizard.skipHint)}
        </p>
        {restored && <p className="tpMuted" style={{ color: "var(--gold-light)" }}>{t(tp.wizard.draftRestored)}</p>}

        <div className="tpCard" style={{ marginTop: "1.2rem", padding: "1.5rem" }}>
          {step === 0 && (
            <>
              <div className="tpField">
                <label htmlFor="w-name">{t(tp.wizard.tripName)} *</label>
                <input id="w-name" value={d.name} onChange={(e) => set("name", e.target.value)} maxLength={120} />
                {errors.name && <span className="tpErr">{errors.name}</span>}
              </div>
              <div className="tpField">
                <label htmlFor="w-origin">{t(tp.wizard.origin)}</label>
                <input id="w-origin" value={d.origin} onChange={(e) => set("origin", e.target.value)} />
              </div>
              <div className="tpField">
                <label>{t(tp.wizard.destinations)} *</label>
                {d.destinations.map((dest, i) => (
                  <div key={i} style={{ display: "flex", gap: 8 }}>
                    <input
                      aria-label={`${t(tp.wizard.destinations)} ${i + 1}`}
                      value={dest.name}
                      placeholder={i === 0 ? "Istanbul" : ""}
                      onChange={(e) => set("destinations", d.destinations.map((x, j) => (j === i ? { name: e.target.value } : x)))}
                      style={{ flex: 1 }}
                    />
                    {d.destinations.length > 1 && (
                      <button type="button" className="tpBtn tpBtnSm tpBtnDanger" onClick={() => set("destinations", d.destinations.filter((_, j) => j !== i))} aria-label={t(tp.planner.remove)}>✕</button>
                    )}
                  </div>
                ))}
                {d.destinations.length < 10 && (
                  <button type="button" className="tpBtn tpBtnSm" onClick={() => set("destinations", [...d.destinations, { name: "" }])} style={{ alignSelf: "flex-start" }}>
                    + {t(tp.wizard.addDestination)}
                  </button>
                )}
                {errors.destinations && <span className="tpErr">{errors.destinations}</span>}
              </div>
              <div className="tpRow">
                <div className="tpField">
                  <label htmlFor="w-start">{t(tp.wizard.startDate)}</label>
                  <input id="w-start" type="date" value={d.startDate} onChange={(e) => set("startDate", e.target.value)} />
                </div>
                <div className="tpField">
                  <label htmlFor="w-end">{t(tp.wizard.endDate)}</label>
                  <input id="w-end" type="date" value={d.endDate} min={d.startDate || undefined} onChange={(e) => set("endDate", e.target.value)} />
                  {errors.endDate && <span className="tpErr">{errors.endDate}</span>}
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="tpRow">
                <div className="tpField">
                  <label htmlFor="w-adults">{t(tp.wizard.adults)}</label>
                  <input id="w-adults" type="number" min={1} max={50} value={d.adults} onChange={(e) => set("adults", Number(e.target.value) || 1)} />
                </div>
                <div className="tpField">
                  <label htmlFor="w-children">{t(tp.wizard.children)}</label>
                  <input id="w-children" type="number" min={0} max={30} value={d.children} onChange={(e) => set("children", Number(e.target.value) || 0)} />
                </div>
              </div>
              {d.children > 0 && (
                <div className="tpField">
                  <label htmlFor="w-ages">{t({ en: "Child ages (comma separated)", ar: "أعمار الأطفال (مفصولة بفواصل)" })}</label>
                  <input id="w-ages" value={d.childAges} placeholder="4, 9" onChange={(e) => set("childAges", e.target.value)} />
                </div>
              )}
              <div className="tpField">
                <label>{t(tp.wizard.partyType)}</label>
                <div className="tpChips" role="group">
                  {partyKeys.map((k) => (
                    <button key={k} type="button" className="tpChip" aria-pressed={d.partyType === k} onClick={() => set("partyType", k)}>
                      {t(tp.wizard.party[k])}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="tpRow">
                <div className="tpField">
                  <label htmlFor="w-cur">{t(tp.wizard.currency)}</label>
                  <select id="w-cur" value={d.currency} onChange={(e) => set("currency", e.target.value)}>
                    {["SAR", "USD", "EUR", "AED", "GBP", "TRY"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="tpField">
                  <label htmlFor="w-budget">{t(tp.wizard.budget)}</label>
                  <input id="w-budget" type="number" min={0} value={d.budgetTotal} onChange={(e) => set("budgetTotal", e.target.value)} />
                  <label style={{ display: "flex", gap: 6, alignItems: "center", textTransform: "none", letterSpacing: 0, fontSize: "0.8rem", color: "var(--ivory)" }}>
                    <input type="checkbox" checked={d.budgetPerPerson} onChange={(e) => set("budgetPerPerson", e.target.checked)} style={{ minHeight: "auto", width: 16 }} />
                    {t(tp.wizard.perPerson)}
                  </label>
                </div>
              </div>
              <div className="tpField">
                <label>{t(tp.wizard.accommodation)}</label>
                <div className="tpChips">
                  {(Object.keys(tp.wizard.accom) as (keyof typeof tp.wizard.accom)[]).map((k) => (
                    <button key={k} type="button" className="tpChip" aria-pressed={d.accommodationLevel === k} onClick={() => set("accommodationLevel", d.accommodationLevel === k ? "" : k)}>
                      {t(tp.wizard.accom[k])}
                    </button>
                  ))}
                </div>
              </div>
              <div className="tpField">
                <label>{t(tp.wizard.pace)}</label>
                <div className="tpChips">
                  {(Object.keys(tp.wizard.paces) as (keyof typeof tp.wizard.paces)[]).map((k) => (
                    <button key={k} type="button" className="tpChip" aria-pressed={d.pace === k} onClick={() => set("pace", k)}>
                      {t(tp.wizard.paces[k])}
                    </button>
                  ))}
                </div>
              </div>
              <div className="tpField">
                <label>{t(tp.wizard.interests)}</label>
                <div className="tpChips">
                  {interestKeys.map((k) => (
                    <button key={k} type="button" className="tpChip" aria-pressed={d.interests.includes(k)} onClick={() => toggle("interests", k)}>
                      {t(tp.wizard.interest[k])}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="tpField">
                <label>{t(tp.wizard.transport)}</label>
                <div className="tpChips">
                  {modeKeys.map((k) => (
                    <button key={k} type="button" className="tpChip" aria-pressed={d.transportPrefs.includes(k)} onClick={() => toggle("transportPrefs", k)}>
                      {t(tp.wizard.modes[k])}
                    </button>
                  ))}
                </div>
              </div>
              <div className="tpRow">
                <div className="tpField">
                  <label htmlFor="w-diet">{t(tp.wizard.dietary)}</label>
                  <input id="w-diet" value={d.dietary} placeholder={lang === "ar" ? "حلال، نباتي…" : "Halal, vegetarian…"} onChange={(e) => set("dietary", e.target.value)} />
                </div>
                <div className="tpField">
                  <label htmlFor="w-acc">{t(tp.wizard.accessibility)}</label>
                  <input id="w-acc" value={d.accessibility} onChange={(e) => set("accessibility", e.target.value)} />
                </div>
              </div>
              <div className="tpRow">
                <div className="tpField">
                  <label htmlFor="w-ds">{t(tp.wizard.dayStart)}</label>
                  <input id="w-ds" type="time" value={d.dayStart} onChange={(e) => set("dayStart", e.target.value)} />
                </div>
                <div className="tpField">
                  <label htmlFor="w-de">{t(tp.wizard.dayEnd)}</label>
                  <input id="w-de" type="time" value={d.dayEnd} onChange={(e) => set("dayEnd", e.target.value)} />
                </div>
              </div>
              <div className="tpField">
                <label htmlFor="w-notes">{t(tp.wizard.notes)}</label>
                <textarea id="w-notes" rows={3} value={d.notes} onChange={(e) => set("notes", e.target.value)} />
              </div>
            </>
          )}

          {errors._ && <p className="tpErr" role="alert">{errors._}</p>}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.2rem" }}>
            <button type="button" className="tpBtn" disabled={step === 0 || busy} onClick={() => setStep((s) => s - 1)}>
              {t(tp.wizard.back)}
            </button>
            {step < steps.length - 1 ? (
              <button type="button" className="tpBtn tpBtnGold" disabled={!validStep} onClick={() => setStep((s) => s + 1)}>
                {t(tp.wizard.next)}
              </button>
            ) : (
              <button type="button" className="tpBtn tpBtnGold" disabled={busy || !validStep} onClick={submit}>
                {busy ? t(tp.wizard.creating) : t(tp.wizard.create)}
              </button>
            )}
          </div>
        </div>
      </div>
    </PlannerShell>
  );
}
