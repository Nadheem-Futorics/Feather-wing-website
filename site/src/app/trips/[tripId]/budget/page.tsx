"use client";

import { use, useCallback, useEffect, useState } from "react";
import "../../planner.css";
import PlannerShell from "@/components/planner/PlannerShell";
import { useLang } from "@/lib/i18n";
import { tp } from "@/lib/tp-i18n";
import { api, jpost, type MemberDto } from "@/lib/tp-client";

interface Expense {
  id: string; title: string; category: string; amount: number; currency: string; baseAmount: number | null;
  paidBy: string | null; spentAt: string | null; planned: boolean; splits: { profileId: string; share: number }[];
}
interface Data {
  expenses: Expense[]; settlement: { profileId: string; balance: number }[]; members: MemberDto[];
  baseCurrency: string; fx: { live: boolean; label: string };
}

export default function BudgetPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const { t, lang } = useLang();
  const [data, setData] = useState<Data | null>(null);
  const [budgetTotal, setBudgetTotal] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", amount: "", currency: "SAR", category: "other", planned: false, splitEqually: true });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<Data>(`/api/tp/trips/${tripId}/expenses`).then((d) => {
      setData(d);
      setForm((f) => ({ ...f, currency: d.baseCurrency }));
    });
    api<{ trip: { budgetTotal: number | null } }>(`/api/tp/trips/${tripId}`).then((d) => setBudgetTotal(d.trip.budgetTotal));
  }, [tripId]);
  useEffect(load, [load]);

  const nf = (n: number) => n.toLocaleString(lang === "ar" ? "ar" : "en", { maximumFractionDigits: 2 });
  const memberName = (id: string | null) => data?.members.find((m) => m.profileId === id)?.displayName ?? "—";

  const spent = data?.expenses.filter((e) => !e.planned).reduce((s, e) => s + (e.baseAmount ?? e.amount), 0) ?? 0;
  const planned = data?.expenses.filter((e) => e.planned).reduce((s, e) => s + (e.baseAmount ?? e.amount), 0) ?? 0;
  const remaining = budgetTotal != null ? budgetTotal - spent : null;
  const perPerson = data && data.members.length ? spent / data.members.length : spent;

  const byCat = new Map<string, number>();
  data?.expenses.filter((e) => !e.planned).forEach((e) => byCat.set(e.category, (byCat.get(e.category) ?? 0) + (e.baseAmount ?? e.amount)));

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!data || !form.title.trim() || !form.amount) return;
    setBusy(true);
    try {
      await jpost(`/api/tp/trips/${tripId}/expenses`, {
        title: form.title.trim(), amount: Number(form.amount), currency: form.currency, category: form.category,
        planned: form.planned,
        splitEqualAmong: form.splitEqually ? data.members.map((m) => m.profileId) : undefined,
      });
      setForm((f) => ({ ...f, title: "", amount: "" }));
      load();
    } finally {
      setBusy(false);
    }
  }

  const catKeys = Object.keys(tp.budget.cats) as (keyof typeof tp.budget.cats)[];

  return (
    <PlannerShell tripId={tripId}>
      <div className="tpNarrow">
        <p className="kicker">{t(tp.planner.budget)}</p>
        <h1 className="serif tpH1" style={{ marginBottom: "1rem" }}>{t(tp.planner.budget)}</h1>
        {!data ? (
          <><div className="tpSkeleton" /><div className="tpSkeleton" /></>
        ) : (
          <>
            <div className="tpStatGrid">
              <div className="tpStat">{t(tp.budget.spent)}<b>{nf(spent)} {data.baseCurrency}</b></div>
              <div className="tpStat">{t(tp.budget.planned)}<b>{nf(planned)} {data.baseCurrency}</b></div>
              {remaining != null && (
                <div className={`tpStat ${remaining < 0 ? "warn" : ""}`}>
                  {remaining < 0 ? t(tp.budget.overBudget) : t(tp.budget.remaining)}<b>{nf(Math.abs(remaining))} {data.baseCurrency}</b>
                </div>
              )}
              <div className="tpStat">{t({ en: "Per person", ar: "للفرد" })}<b>{nf(perPerson)} {data.baseCurrency}</b></div>
            </div>
            <p className="tpMuted" style={{ fontSize: "0.72rem" }}>{data.fx.label}</p>

            <form onSubmit={addExpense} className="tpCard" style={{ marginBlock: "1rem", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: "0.5rem", alignItems: "end" }}>
              <div className="tpField" style={{ margin: 0 }}>
                <label htmlFor="e-title">{t(tp.budget.title)}</label>
                <input id="e-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="tpField" style={{ margin: 0 }}>
                <label htmlFor="e-amount">{t(tp.budget.amount)}</label>
                <input id="e-amount" type="number" min={0} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="tpField" style={{ margin: 0 }}>
                <label htmlFor="e-cur">{t(tp.wizard.currency)}</label>
                <select id="e-cur" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  {["SAR", "USD", "EUR", "AED", "GBP", "TRY"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="tpField" style={{ margin: 0 }}>
                <label htmlFor="e-cat">{t(tp.budget.category)}</label>
                <select id="e-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {catKeys.map((c) => <option key={c} value={c}>{t(tp.budget.cats[c])}</option>)}
                </select>
              </div>
              <button className="tpBtn tpBtnGold" disabled={busy} type="submit">+</button>
              <label style={{ gridColumn: "1 / -1", display: "flex", gap: 6, alignItems: "center", fontSize: "0.8rem", color: "var(--ivory)" }}>
                <input type="checkbox" checked={form.splitEqually} onChange={(e) => setForm({ ...form, splitEqually: e.target.checked })} />
                {t(tp.budget.splitEqually)}
              </label>
            </form>

            <table className="tpTable">
              <thead>
                <tr><th>{t(tp.budget.title)}</th><th>{t(tp.budget.category)}</th><th>{t(tp.budget.amount)}</th><th>{t(tp.budget.paidBy)}</th><th /></tr>
              </thead>
              <tbody>
                {data.expenses.map((e) => (
                  <tr key={e.id}>
                    <td>{e.title}{e.planned && <span className="tpBadge tpBadgeDev" style={{ marginInlineStart: 6 }}>{t(tp.budget.planned)}</span>}</td>
                    <td>{t(tp.budget.cats[e.category as keyof typeof tp.budget.cats] ?? { en: e.category, ar: e.category })}</td>
                    <td>{nf(e.amount)} {e.currency}{e.baseAmount != null && e.currency !== data.baseCurrency ? ` (≈${nf(e.baseAmount)} ${data.baseCurrency})` : ""}</td>
                    <td>{memberName(e.paidBy)}</td>
                    <td>
                      <button className="tpBtn tpBtnSm tpBtnDanger" onClick={async () => { await api(`/api/tp/trips/${tripId}/expenses`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expenseId: e.id }) }); load(); }} aria-label={t(tp.planner.remove)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {byCat.size > 0 && (
              <div style={{ marginTop: "1.4rem" }}>
                <h2 className="serif" style={{ color: "var(--white)", fontSize: "1.2rem", marginBottom: "0.6rem" }}>{t(tp.budget.category)}</h2>
                {[...byCat.entries()].map(([cat, amt]) => (
                  <div key={cat} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ width: 120, fontSize: "0.8rem", color: "var(--ivory)" }}>{t(tp.budget.cats[cat as keyof typeof tp.budget.cats] ?? { en: cat, ar: cat })}</span>
                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: "rgba(115,85,216,0.2)" }}>
                      <div style={{ width: `${Math.min(100, (amt / Math.max(spent, 1)) * 100)}%`, height: "100%", borderRadius: 4, background: "linear-gradient(90deg, var(--gold), var(--gold-light))" }} />
                    </div>
                    <span style={{ fontSize: "0.8rem", color: "var(--gold-light)" }}>{nf(amt)}</span>
                  </div>
                ))}
              </div>
            )}

            {data.settlement.length > 0 && (
              <div style={{ marginTop: "1.4rem" }}>
                <h2 className="serif" style={{ color: "var(--white)", fontSize: "1.2rem", marginBottom: "0.6rem" }}>{t(tp.budget.settlement)}</h2>
                {data.settlement.map((s) => (
                  <p key={s.profileId} className="tpMuted" style={{ marginBottom: 4 }}>
                    <strong style={{ color: "var(--ivory)" }}>{memberName(s.profileId)}</strong>{" "}
                    {s.balance >= 0 ? t(tp.budget.isOwed) : t(tp.budget.owes)}{" "}
                    <span style={{ color: s.balance >= 0 ? "var(--gold-light)" : "#e5a89b" }}>{nf(Math.abs(s.balance))} {data.baseCurrency}</span>
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PlannerShell>
  );
}
