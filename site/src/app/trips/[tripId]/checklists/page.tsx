"use client";

import { use, useCallback, useEffect, useState } from "react";
import "../../planner.css";
import PlannerShell from "@/components/planner/PlannerShell";
import { useLang } from "@/lib/i18n";
import { tp } from "@/lib/tp-i18n";
import { api, jpost } from "@/lib/tp-client";

interface CL { id: string; name: string; kind: string; items: { id: string; text: string; done: boolean; source: string }[] }

export default function ChecklistsPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const { t } = useLang();
  const [lists, setLists] = useState<CL[] | null>(null);
  const [newItem, setNewItem] = useState<Record<string, string>>({});
  const [newList, setNewList] = useState("");

  const load = useCallback(() => {
    api<{ checklists: CL[] }>(`/api/tp/trips/${tripId}/checklists`).then((d) => setLists(d.checklists));
  }, [tripId]);
  useEffect(load, [load]);

  const post = (body: unknown) => jpost(`/api/tp/trips/${tripId}/checklists`, body).then(load);

  return (
    <PlannerShell tripId={tripId}>
      <div className="tpNarrow">
        <p className="kicker">{t(tp.planner.checklists)}</p>
        <h1 className="serif tpH1" style={{ marginBottom: "1rem" }}>{t(tp.planner.checklists)}</h1>

        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1.2rem" }}>
          <button className="tpBtn tpBtnGold" onClick={() => post({ op: "suggest" })}>
            ✦ {t({ en: "Suggest checklists for this trip", ar: "اقترح قوائم لهذه الرحلة" })}
          </button>
          <form onSubmit={(e) => { e.preventDefault(); if (newList.trim()) { post({ op: "create", list: { name: newList.trim(), kind: "custom" } }); setNewList(""); } }} style={{ display: "flex", gap: 6 }}>
            <input value={newList} onChange={(e) => setNewList(e.target.value)} placeholder={t({ en: "New checklist name", ar: "اسم قائمة جديدة" })}
              style={{ minHeight: 44, background: "rgba(3,6,17,0.6)", border: "1px solid rgba(115,85,216,0.4)", borderRadius: 10, color: "var(--ivory)", padding: "0 0.8rem" }} />
            <button className="tpBtn" type="submit">+</button>
          </form>
        </div>

        {lists === null && <div className="tpSkeleton" />}
        {lists?.length === 0 && <div className="tpEmpty">{t({ en: "No checklists yet — use the suggestion button to start.", ar: "لا قوائم بعد — استخدم زر الاقتراح للبدء." })}</div>}
        {lists?.map((l) => {
          const done = l.items.filter((i) => i.done).length;
          return (
            <div key={l.id} className="tpCard" style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.6rem" }}>
                <h2 className="serif" style={{ color: "var(--white)", fontSize: "1.15rem" }}>{l.name}</h2>
                <span className="tpMuted" style={{ fontSize: "0.75rem" }}>{done}/{l.items.length}</span>
              </div>
              {l.items.map((i) => (
                <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.3rem 0" }}>
                  <input
                    type="checkbox"
                    id={`ci-${i.id}`}
                    checked={i.done}
                    onChange={(e) => post({ op: "toggle", itemId: i.id, done: e.target.checked })}
                    style={{ width: 18, height: 18, accentColor: "#e5a52e" }}
                  />
                  <label htmlFor={`ci-${i.id}`} style={{ flex: 1, color: "var(--ivory)", textDecoration: i.done ? "line-through" : "none", opacity: i.done ? 0.55 : 1, fontSize: "0.9rem" }}>
                    {i.text} {i.source === "ai" && <span className="tpBadge tpBadgeDev">AI</span>}
                  </label>
                  <button className="tpBtn tpBtnSm tpBtnDanger" onClick={() => post({ op: "delete-item", itemId: i.id })} aria-label={t(tp.planner.remove)}>✕</button>
                </div>
              ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = (newItem[l.id] ?? "").trim();
                  if (v) {
                    post({ op: "add-items", checklistId: l.id, items: [{ text: v }] });
                    setNewItem((s) => ({ ...s, [l.id]: "" }));
                  }
                }}
                style={{ display: "flex", gap: 6, marginTop: "0.5rem" }}
              >
                <input
                  value={newItem[l.id] ?? ""}
                  onChange={(e) => setNewItem((s) => ({ ...s, [l.id]: e.target.value }))}
                  placeholder={t({ en: "Add item…", ar: "أضف عنصرًا…" })}
                  style={{ flex: 1, minHeight: 38, background: "rgba(3,6,17,0.6)", border: "1px solid rgba(115,85,216,0.35)", borderRadius: 8, color: "var(--ivory)", padding: "0 0.7rem" }}
                />
                <button className="tpBtn tpBtnSm" type="submit">+</button>
              </form>
            </div>
          );
        })}
      </div>
    </PlannerShell>
  );
}
