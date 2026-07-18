"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import "../../trips/planner.css";
import PlannerShell from "@/components/planner/PlannerShell";
import AdminBar from "@/components/planner/AdminBar";
import { api, jpost, ApiError } from "@/lib/tp-client";

interface Supplier {
  id: string; category: string; subtype: string | null; name: string; city: string | null; country: string | null;
  contactName: string | null; phone: string | null; email: string | null; whatsapp: string | null; website: string | null;
  paymentTerms: string | null; cancellationPolicy: string | null; notes: string | null; rating: number | null; status: string;
}
interface Rate {
  id: string; supplierId: string; serviceName: string; unit: string; currency: string; adultCost: number | null;
  childCost: number | null; validFrom: string | null; validTo: string | null; notes: string | null; active: boolean; expired: boolean;
}
interface ComparisonRow extends Rate {
  supplierName: string; supplierRating: number | null; supplierStatus: string;
}

const CATEGORIES = ["hotel", "transport", "activity", "restaurant", "guide", "visa", "insurance", "other"];
const STATUSES = ["active", "inactive", "blacklisted"];
const UNITS = ["per_person", "per_room", "per_night", "per_vehicle", "per_day", "fixed"];

const field = (label: string, node: React.ReactNode) => (
  <div className="tpField" style={{ margin: 0 }}>
    <label>{label}</label>
    {node}
  </div>
);

function SupplierForm({ onSaved }: { onSaved: () => void }) {
  const empty = {
    category: "hotel", subtype: "", name: "", city: "", country: "", contactName: "", phone: "", email: "",
    whatsapp: "", website: "", paymentTerms: "", cancellationPolicy: "", notes: "", rating: "",
  };
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
          await jpost("/api/tp/admin/suppliers", { ...f, rating: f.rating ? Number(f.rating) : undefined });
          setF(empty); onSaved();
        } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
      }}
    >
      <h3 className="serif" style={{ gridColumn: "1 / -1", color: "var(--white)" }}>Add a supplier</h3>
      {field("Category", <select value={f.category} onChange={(e) => set("category", e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>)}
      {field("Subtype", <input value={f.subtype} onChange={(e) => set("subtype", e.target.value)} placeholder="e.g. 4-star hotel, SUV, adventure" />)}
      {field("Supplier name", <input value={f.name} onChange={(e) => set("name", e.target.value)} required />)}
      {field("City", <input value={f.city} onChange={(e) => set("city", e.target.value)} />)}
      {field("Country", <input value={f.country} onChange={(e) => set("country", e.target.value)} />)}
      {field("Rating (1-5)", <select value={f.rating} onChange={(e) => set("rating", e.target.value)}><option value="">—</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select>)}
      {field("Contact name", <input value={f.contactName} onChange={(e) => set("contactName", e.target.value)} />)}
      {field("Phone", <input value={f.phone} onChange={(e) => set("phone", e.target.value)} />)}
      {field("Email", <input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />)}
      {field("WhatsApp", <input value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />)}
      {field("Website", <input value={f.website} onChange={(e) => set("website", e.target.value)} />)}
      {field("Payment terms", <input value={f.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} placeholder="e.g. 50% deposit, balance 7 days before" />)}
      <div className="tpField" style={{ margin: 0, gridColumn: "1 / -1" }}>
        <label>Cancellation policy</label>
        <textarea rows={2} value={f.cancellationPolicy} onChange={(e) => set("cancellationPolicy", e.target.value)} />
      </div>
      <div className="tpField" style={{ margin: 0, gridColumn: "1 / -1" }}>
        <label>Notes</label>
        <textarea rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>
      {err && <p className="tpErr" style={{ gridColumn: "1 / -1" }}>{err}</p>}
      <button className="tpBtn tpBtnGold" disabled={busy} type="submit" style={{ gridColumn: "1 / -1" }}>{busy ? "…" : "Add supplier"}</button>
    </form>
  );
}

function RateForm({ supplierId, onSaved }: { supplierId: string; onSaved: () => void }) {
  const empty = { serviceName: "", unit: "fixed", currency: "SAR", adultCost: "", childCost: "", validFrom: "", validTo: "", notes: "" };
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
          await jpost("/api/tp/admin/suppliers/rates", {
            supplierId, serviceName: f.serviceName, unit: f.unit, currency: f.currency,
            adultCost: f.adultCost ? Number(f.adultCost) : undefined, childCost: f.childCost ? Number(f.childCost) : undefined,
            validFrom: f.validFrom || undefined, validTo: f.validTo || undefined, notes: f.notes || undefined,
          });
          setF(empty); onSaved();
        } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
      }}
    >
      <h3 className="serif" style={{ gridColumn: "1 / -1", color: "var(--white)" }}>Add a rate</h3>
      {field("Service name", <input value={f.serviceName} onChange={(e) => set("serviceName", e.target.value)} placeholder="e.g. Deluxe double room" required />)}
      {field("Unit", <select value={f.unit} onChange={(e) => set("unit", e.target.value)}>{UNITS.map((u) => <option key={u} value={u}>{u.replace("_", " ")}</option>)}</select>)}
      {field("Currency", <input value={f.currency} maxLength={3} onChange={(e) => set("currency", e.target.value.toUpperCase())} />)}
      {field("Adult cost", <input type="number" min={0} step="0.01" value={f.adultCost} onChange={(e) => set("adultCost", e.target.value)} />)}
      {field("Child cost", <input type="number" min={0} step="0.01" value={f.childCost} onChange={(e) => set("childCost", e.target.value)} />)}
      {field("Valid from", <input type="date" value={f.validFrom} onChange={(e) => set("validFrom", e.target.value)} />)}
      {field("Valid to", <input type="date" value={f.validTo} onChange={(e) => set("validTo", e.target.value)} />)}
      {field("Notes", <input value={f.notes} onChange={(e) => set("notes", e.target.value)} />)}
      {err && <p className="tpErr" style={{ gridColumn: "1 / -1" }}>{err}</p>}
      <button className="tpBtn tpBtnGold" disabled={busy} type="submit" style={{ gridColumn: "1 / -1" }}>{busy ? "…" : "Add rate"}</button>
    </form>
  );
}

export default function SuppliersPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"directory" | "rates" | "compare" | "calculator">("directory");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [rateSupplierId, setRateSupplierId] = useState<string>("");
  const [rates, setRates] = useState<Rate[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [cmpCategory, setCmpCategory] = useState("");
  const [cmpCity, setCmpCity] = useState("");
  const [cmpQuery, setCmpQuery] = useState("");
  const [cmpResults, setCmpResults] = useState<ComparisonRow[] | null>(null);

  const [calc, setCalc] = useState({ baseCost: "", travelers: "1", markupType: "percent", markupValue: "20", taxPercent: "0", discount: "0" });

  const onError = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) { router.push("/admin/login"); return; }
    setError(e instanceof Error ? e.message : "Failed");
  }, [router]);

  const loadSuppliers = useCallback(() => {
    api<{ suppliers: Supplier[] }>("/api/tp/admin/suppliers").then((d) => setSuppliers(d.suppliers)).catch(onError);
  }, [onError]);
  useEffect(loadSuppliers, [loadSuppliers]);

  const loadRates = useCallback((supplierId: string) => {
    if (!supplierId) { queueMicrotask(() => setRates([])); return; }
    api<{ rates: Rate[] }>(`/api/tp/admin/suppliers/rates?supplierId=${supplierId}`).then((d) => setRates(d.rates)).catch(onError);
  }, [onError]);
  useEffect(() => { loadRates(rateSupplierId); }, [rateSupplierId, loadRates]);

  const openRates = (supplierId: string) => {
    setRateSupplierId(supplierId);
    setTab("rates");
  };

  const mutateSupplier = async (body: unknown, method: "PATCH" | "DELETE") => {
    await jpost("/api/tp/admin/suppliers", body, method);
    loadSuppliers();
  };

  const mutateRate = async (body: unknown, method: "PATCH" | "DELETE") => {
    await jpost("/api/tp/admin/suppliers/rates", body, method);
    loadRates(rateSupplierId);
  };

  const runComparison = useCallback(() => {
    const params = new URLSearchParams();
    if (cmpCategory) params.set("category", cmpCategory);
    if (cmpCity) params.set("city", cmpCity);
    if (cmpQuery) params.set("query", cmpQuery);
    api<{ rates: ComparisonRow[] }>(`/api/tp/admin/suppliers/compare?${params}`).then((d) => setCmpResults(d.rates)).catch(onError);
  }, [cmpCategory, cmpCity, cmpQuery, onError]);

  const sendToCalculator = (row: ComparisonRow) => {
    setCalc((p) => ({ ...p, baseCost: String(row.adultCost ?? "") }));
    setTab("calculator");
  };

  const calcOut = useMemo(() => {
    const base = Number(calc.baseCost) || 0;
    const travelers = Number(calc.travelers) || 0;
    const totalCost = base * travelers;
    const markup = calc.markupType === "percent" ? totalCost * ((Number(calc.markupValue) || 0) / 100) : (Number(calc.markupValue) || 0);
    const preTax = totalCost + markup - (Number(calc.discount) || 0);
    const tax = preTax * ((Number(calc.taxPercent) || 0) / 100);
    const sellingPrice = preTax + tax;
    const profit = sellingPrice - totalCost - tax;
    const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
    return { totalCost, markup, sellingPrice, profit, margin, tax };
  }, [calc]);

  const selectedSupplier = suppliers.find((s) => s.id === rateSupplierId);

  return (
    <PlannerShell>
      <div className="tpWrap">
        <AdminBar />
        {error && <div className="tpEmpty" role="alert">{error}</div>}
        {!error && (
          <>
            <p className="kicker">Admin</p>
            <h1 className="serif tpH1" style={{ marginBottom: "0.6rem" }}>Suppliers</h1>
            <p className="tpMuted" style={{ marginBottom: "1rem" }}>
              Directory, rate sheets, side-by-side comparison, and a selling-price calculator — internal tools, not shown on the public site.
            </p>

            <nav style={{ display: "flex", gap: 6, marginBottom: "1.2rem", flexWrap: "wrap" }}>
              <button className={`tpBtn ${tab === "directory" ? "tpBtnGold" : ""}`} onClick={() => setTab("directory")}>Directory ({suppliers.length})</button>
              <button className={`tpBtn ${tab === "rates" ? "tpBtnGold" : ""}`} onClick={() => setTab("rates")}>Rate Sheets</button>
              <button className={`tpBtn ${tab === "compare" ? "tpBtnGold" : ""}`} onClick={() => setTab("compare")}>Comparison</button>
              <button className={`tpBtn ${tab === "calculator" ? "tpBtnGold" : ""}`} onClick={() => setTab("calculator")}>Pricing Calculator</button>
            </nav>

            {tab === "directory" && (
              <>
                <SupplierForm onSaved={loadSuppliers} />
                {suppliers.length === 0 && <div className="tpEmpty">No suppliers yet.</div>}
                {suppliers.map((s) => (
                  <div key={s.id} className="tpItem">
                    <div className="tpItemBody" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <div>
                        <div className="tpItemName">
                          {s.name} <span className="tpBadge">{s.category}</span>
                          {s.rating && <span className="tpBadge tpBadgePkg">★ {s.rating}</span>}
                          {s.status !== "active" && <span className="tpBadge tpBadgeDev">{s.status}</span>}
                        </div>
                        <div className="tpItemMeta">
                          {s.subtype && <span>{s.subtype}</span>}
                          {s.city && <span>{s.city}{s.country ? `, ${s.country}` : ""}</span>}
                          {s.contactName && <span>{s.contactName}</span>}
                          {s.phone && <span>{s.phone}</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <select
                          value={s.status}
                          onChange={(e) => mutateSupplier({ id: s.id, data: { status: e.target.value } }, "PATCH")}
                          style={{ minHeight: 34, background: "rgba(3,6,17,0.6)", border: "1px solid rgba(115,85,216,0.4)", borderRadius: 8, color: "var(--ivory)", padding: "0 0.5rem", fontSize: "0.78rem" }}
                        >
                          {STATUSES.map((st) => <option key={st}>{st}</option>)}
                        </select>
                        <button className="tpBtn tpBtnSm" onClick={() => openRates(s.id)}>Rates</button>
                        <button className="tpBtn tpBtnSm tpBtnDanger" onClick={() => mutateSupplier({ id: s.id }, "DELETE")}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {tab === "rates" && (
              <>
                <div className="tpField" style={{ maxWidth: 360, marginBottom: "1rem" }}>
                  <label>Supplier</label>
                  <select value={rateSupplierId} onChange={(e) => setRateSupplierId(e.target.value)}>
                    <option value="">Select a supplier…</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.category})</option>)}
                  </select>
                </div>
                {!rateSupplierId && <div className="tpEmpty">Pick a supplier to view or add rates.</div>}
                {rateSupplierId && (
                  <>
                    <RateForm supplierId={rateSupplierId} onSaved={() => loadRates(rateSupplierId)} />
                    {rates.length === 0 && <div className="tpEmpty">No rates yet for {selectedSupplier?.name}.</div>}
                    {rates.map((r) => (
                      <div key={r.id} className="tpItem">
                        <div className="tpItemBody" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <div>
                            <div className="tpItemName">
                              {r.serviceName} <span className="tpBadge">{r.unit.replace("_", " ")}</span>
                              {r.expired && <span className="tpBadge tpBadgeDev">expired</span>}
                              {!r.active && <span className="tpBadge tpBadgeDev">hidden</span>}
                            </div>
                            <div className="tpItemMeta">
                              <span>{r.currency} {r.adultCost ?? "—"} adult{r.childCost != null ? ` · ${r.currency} ${r.childCost} child` : ""}</span>
                              {(r.validFrom || r.validTo) && <span>{r.validFrom ?? "…"} → {r.validTo ?? "…"}</span>}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="tpBtn tpBtnSm" onClick={() => mutateRate({ id: r.id, data: { active: !r.active } }, "PATCH")}>{r.active ? "Hide" : "Show"}</button>
                            <button className="tpBtn tpBtnSm tpBtnDanger" onClick={() => mutateRate({ id: r.id }, "DELETE")}>Delete</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}

            {tab === "compare" && (
              <>
                <div className="tpCard" style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap", alignItems: "end", marginBottom: "1.2rem" }}>
                  {field("Category", <select value={cmpCategory} onChange={(e) => setCmpCategory(e.target.value)}><option value="">All</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>)}
                  {field("City", <input value={cmpCity} onChange={(e) => setCmpCity(e.target.value)} placeholder="e.g. AlUla" />)}
                  {field("Search", <input value={cmpQuery} onChange={(e) => setCmpQuery(e.target.value)} placeholder="service or supplier name" />)}
                  <button className="tpBtn tpBtnGold" onClick={runComparison}>Compare</button>
                </div>

                {cmpResults === null && <div className="tpEmpty">Set filters and click Compare.</div>}
                {cmpResults?.length === 0 && <div className="tpEmpty">No matching rates.</div>}
                {cmpResults && cmpResults.length > 0 && (
                  <table className="tpTable">
                    <thead><tr><th>Supplier</th><th>Service</th><th>Cost</th><th>Validity</th><th></th></tr></thead>
                    <tbody>
                      {cmpResults.map((r) => (
                        <tr key={r.id}>
                          <td>
                            {r.supplierName}
                            {r.supplierRating && <div className="tpMuted" style={{ fontSize: "0.72rem" }}>★ {r.supplierRating} · {r.supplierStatus}</div>}
                          </td>
                          <td>{r.serviceName}<div className="tpMuted" style={{ fontSize: "0.72rem" }}>{r.unit.replace("_", " ")}</div></td>
                          <td>{r.currency} {r.adultCost ?? "—"}</td>
                          <td>{r.expired ? <span className="tpBadge tpBadgeDev">expired</span> : <span className="tpBadge">valid</span>}</td>
                          <td><button className="tpBtn tpBtnSm" onClick={() => sendToCalculator(r)}>Use in calculator</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}

            {tab === "calculator" && (
              <div className="tpCard" style={{ maxWidth: 640 }}>
                <h3 className="serif" style={{ color: "var(--white)", marginBottom: "0.8rem" }}>Pricing calculator</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem" }}>
                  {field("Base cost per traveller", <input type="number" min={0} step="0.01" value={calc.baseCost} onChange={(e) => setCalc((p) => ({ ...p, baseCost: e.target.value }))} />)}
                  {field("Travellers", <input type="number" min={1} value={calc.travelers} onChange={(e) => setCalc((p) => ({ ...p, travelers: e.target.value }))} />)}
                  {field("Markup type", <select value={calc.markupType} onChange={(e) => setCalc((p) => ({ ...p, markupType: e.target.value }))}><option value="percent">Percent</option><option value="fixed">Fixed amount</option></select>)}
                  {field("Markup value", <input type="number" min={0} step="0.01" value={calc.markupValue} onChange={(e) => setCalc((p) => ({ ...p, markupValue: e.target.value }))} />)}
                  {field("Tax %", <input type="number" min={0} step="0.01" value={calc.taxPercent} onChange={(e) => setCalc((p) => ({ ...p, taxPercent: e.target.value }))} />)}
                  {field("Discount (flat)", <input type="number" min={0} step="0.01" value={calc.discount} onChange={(e) => setCalc((p) => ({ ...p, discount: e.target.value }))} />)}
                </div>

                <hr className="gold-rule" style={{ margin: "1.2rem 0" }} />

                <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem 1rem" }}>
                  <div><dt className="tpMuted" style={{ fontSize: "0.72rem" }}>Total cost</dt><dd style={{ color: "var(--ivory)" }}>{calcOut.totalCost.toFixed(2)}</dd></div>
                  <div><dt className="tpMuted" style={{ fontSize: "0.72rem" }}>Markup applied</dt><dd style={{ color: "var(--ivory)" }}>{calcOut.markup.toFixed(2)}</dd></div>
                  <div><dt className="tpMuted" style={{ fontSize: "0.72rem" }}>Tax</dt><dd style={{ color: "var(--ivory)" }}>{calcOut.tax.toFixed(2)}</dd></div>
                  <div><dt className="tpMuted" style={{ fontSize: "0.72rem" }}>Selling price</dt><dd className="serif" style={{ color: "var(--gold-light)", fontSize: "1.2rem" }}>{calcOut.sellingPrice.toFixed(2)}</dd></div>
                  <div><dt className="tpMuted" style={{ fontSize: "0.72rem" }}>Profit</dt><dd style={{ color: calcOut.profit >= 0 ? "var(--gold-light)" : "#ff8a8a" }}>{calcOut.profit.toFixed(2)}</dd></div>
                  <div><dt className="tpMuted" style={{ fontSize: "0.72rem" }}>Margin</dt><dd style={{ color: calcOut.margin >= 0 ? "var(--ivory)" : "#ff8a8a" }}>{calcOut.margin.toFixed(1)}%</dd></div>
                </dl>
                <p className="tpMuted" style={{ fontSize: "0.72rem", marginTop: "1rem" }}>Not saved — this is a scratch calculator. Note the numbers down in your quotation to the customer.</p>
              </div>
            )}
          </>
        )}
      </div>
    </PlannerShell>
  );
}
