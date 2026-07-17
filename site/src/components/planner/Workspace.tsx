"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLang } from "@/lib/i18n";
import { tp } from "@/lib/tp-i18n";
import { api, jpost, type TripBundle, type ItemDto, type PlaceDto, type SegmentDto, type ProposalDto } from "@/lib/tp-client";
import type { MapPoint } from "./MapView";

const MapView = dynamic(() => import("./MapView"), { ssr: false, loading: () => <div className="tpEmpty" style={{ margin: "1rem" }}>…</div> });

type SaveState = "idle" | "saving" | "saved" | "error";
type MobileTab = "plan" | "map" | "explore" | "ai";

export default function Workspace({ tripId }: { tripId: string }) {
  const { t, lang } = useLang();
  const [bundle, setBundle] = useState<TripBundle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dayId, setDayId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null);
  const [segments, setSegments] = useState<SegmentDto[]>([]);
  const [segSource, setSegSource] = useState("");
  const [mobileTab, setMobileTab] = useState<MobileTab>("plan");
  const [proposal, setProposal] = useState<ProposalDto | null>(null);

  const refresh = useCallback(async (silent = true) => {
    try {
      const b = await api<TripBundle>(`/api/tp/trips/${tripId}`);
      setBundle(b);
      setDayId((cur) => cur ?? b.days[0]?.id ?? null);
      if (!silent) setSaveState("saved");
    } catch (e) {
      if (!silent) setSaveState("error");
      if (!bundle) setLoadError(e instanceof Error ? e.message : "Failed to load");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  useEffect(() => {
    const t = setTimeout(() => refresh(false), 0);
    const iv = setInterval(() => refresh(true), 25000); // collaboration refresh
    return () => {
      clearTimeout(t);
      clearInterval(iv);
    };
  }, [refresh]);

  const dayItems = useMemo(
    () => (bundle?.items ?? []).filter((i) => i.dayId === dayId).sort((a, b) => a.sortOrder - b.sortOrder),
    [bundle, dayId]
  );

  // Travel segments for the active day.
  useEffect(() => {
    if (!dayId) return;
    api<{ segments: SegmentDto[]; source: string }>(`/api/tp/trips/${tripId}/segments?dayId=${dayId}`)
      .then((d) => {
        setSegments(d.segments);
        setSegSource(d.source);
      })
      .catch(() => setSegments([]));
  }, [tripId, dayId, bundle?.trip.updatedAt]);

  const mutate = useCallback(
    async (fn: () => Promise<unknown>, optimistic?: (b: TripBundle) => TripBundle) => {
      setSaveState("saving");
      const before = bundle;
      if (optimistic && bundle) setBundle(optimistic(bundle));
      try {
        await fn();
        await refresh(true);
        setSaveState("saved");
      } catch (e) {
        if (before) setBundle(before); // rollback
        setSaveState("error");
        setToast({ text: e instanceof Error ? e.message : "Failed" });
        setTimeout(() => setSaveState("idle"), 2500);
      }
    },
    [bundle, refresh]
  );

  /* ── item actions ── */
  const patchItem = (itemId: string, patch: Record<string, unknown>) =>
    mutate(() => jpost(`/api/tp/trips/${tripId}/items/${itemId}`, patch, "PATCH"), (b) => ({
      ...b,
      items: b.items.map((i) => (i.id === itemId ? { ...i, ...patch } as ItemDto : i)),
    }));

  const removeItem = (item: ItemDto) =>
    mutate(
      async () => {
        await api(`/api/tp/trips/${tripId}/items/${item.id}`, { method: "DELETE" });
        setToast({
          text: t(tp.planner.removedItem),
          undo: () => {
            setToast(null);
            mutate(() => jpost(`/api/tp/trips/${tripId}/items/${item.id}`, { action: "restore" }));
          },
        });
        setTimeout(() => setToast((x) => (x?.text === t(tp.planner.removedItem) ? null : x)), 8000);
      },
      (b) => ({ ...b, items: b.items.filter((i) => i.id !== item.id) })
    );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = dayItems.map((i) => i.id);
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    mutate(
      () => jpost(`/api/tp/trips/${tripId}/items`, { reorder: { dayId, orderedItemIds: next } }),
      (b) => ({
        ...b,
        items: b.items.map((i) => (i.dayId === dayId ? { ...i, sortOrder: next.indexOf(i.id) } : i)),
      })
    );
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const optimize = () =>
    mutate(async () => {
      const res = await jpost<{ proposalId: string }>(`/api/tp/trips/${tripId}/optimize`, { dayId, mode: "car" });
      const p = await api<{ proposal: ProposalDto }>(`/api/tp/trips/${tripId}/proposals/${res.proposalId}`);
      setProposal(p.proposal);
    });

  const resolveProposal = (id: string, action: "apply" | "reject" | "undo") =>
    mutate(async () => {
      await jpost(`/api/tp/trips/${tripId}/proposals/${id}`, { action });
      if (action === "apply") {
        setToast({ text: t(tp.planner.applied), undo: () => { setToast(null); resolveProposal(id, "undo"); } });
        setTimeout(() => setToast(null), 10000);
      }
      setProposal(null);
    });

  /* ── map points ── */
  const mapPoints: MapPoint[] = useMemo(() => {
    const pts: MapPoint[] = dayItems
      .filter((i) => i.lat != null && i.lng != null)
      .map((i, idx) => ({ id: i.id, lat: i.lat!, lng: i.lng!, label: i.name, index: idx + 1, kind: "item" }));
    return pts;
  }, [dayItems]);

  if (loadError) {
    return <div className="tpNarrow"><div className="tpEmpty" role="alert">{loadError}</div></div>;
  }
  if (!bundle) {
    return (
      <div className="tpWrap">
        <div className="tpSkeleton" style={{ height: 40, maxWidth: 420 }} />
        <div className="tpSkeleton" /><div className="tpSkeleton" /><div className="tpSkeleton" />
      </div>
    );
  }

  const canEdit = bundle.role !== "viewer";
  const activeDay = bundle.days.find((d) => d.id === dayId) ?? null;
  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(lang === "ar" ? "ar" : "en", { weekday: "short", day: "numeric", month: "short" }) : "";

  const show = (tab: MobileTab) => (mobileTab === tab ? "" : "tpHidden");

  return (
    <div className="tpWrap">
      {/* Title row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.6rem", marginBottom: "0.8rem" }}>
        <div>
          <h1 className="serif" style={{ fontSize: "clamp(1.4rem, 2.6vw, 2rem)", color: "var(--white)" }}>{bundle.trip.name}</h1>
          <p className="tpMuted">
            {bundle.destinations.map((d) => d.name).join(" · ")}
            {bundle.trip.startDate ? ` · ${fmtDate(bundle.trip.startDate)} → ${fmtDate(bundle.trip.endDate)}` : ""}
          </p>
        </div>
        <span className={`tpSaveState ${saveState === "error" ? "err" : ""}`} role="status" aria-live="polite">
          {saveState === "saving" && t(tp.planner.saving)}
          {saveState === "saved" && t(tp.planner.saved)}
          {saveState === "error" && t(tp.planner.saveFailed)}
        </span>
      </div>

      {/* Pending AI proposals */}
      {bundle.pendingProposals.map((p) => (
        <ProposalCard key={p.id} p={p} bundle={bundle} onResolve={resolveProposal} disabled={!canEdit} />
      ))}
      {proposal && proposal.status === "pending" && !bundle.pendingProposals.some((x) => x.id === proposal.id) && (
        <ProposalCard p={proposal} bundle={bundle} onResolve={resolveProposal} disabled={!canEdit} />
      )}

      {/* Mobile tabs */}
      <div className="tpTabs" role="tablist" aria-label="Planner sections">
        {(["plan", "map", "explore", "ai"] as MobileTab[]).map((tab) => (
          <button key={tab} role="tab" aria-selected={mobileTab === tab} onClick={() => setMobileTab(tab)}>
            {t(tp.planner[tab === "ai" ? "assistant" : tab])}
          </button>
        ))}
      </div>

      <div className="tpWorkspace">
        {/* ── Plan column ── */}
        <section className={show("plan")} aria-label={t(tp.planner.plan)}>
          <div className="tpDayTabs" role="tablist" aria-label={t(tp.planner.day)}>
            {bundle.days.map((d) => (
              <button key={d.id} role="tab" aria-selected={dayId === d.id} className="tpDayTab" onClick={() => setDayId(d.id)}>
                {t(tp.planner.day)} {(d.dayIndex + 1).toLocaleString(lang === "ar" ? "ar" : "en")}
                {d.date ? ` · ${fmtDate(d.date)}` : ""}
              </button>
            ))}
          </div>

          {activeDay && (
            <p className="tpMuted" style={{ marginBlock: "0.4rem 0.8rem" }}>
              {bundle.destinations.find((x) => x.id === activeDay.destinationId)?.name ?? ""}
            </p>
          )}

          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.8rem", flexWrap: "wrap" }}>
            {canEdit && <AddActivity tripId={tripId} dayId={dayId} onDone={() => refresh(true)} />}
            {canEdit && dayItems.length > 1 && (
              <button className="tpBtn tpBtnSm" onClick={optimize}>⚙ {t(tp.planner.optimizeDay)}</button>
            )}
          </div>

          {dayItems.length === 0 && <div className="tpEmpty">{t(tp.planner.emptyDay)}</div>}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={dayItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <ol style={{ listStyle: "none" }} aria-label={`${t(tp.planner.day)} ${((activeDay?.dayIndex ?? 0) + 1)}`}>
                {dayItems.map((item, idx) => {
                  const seg = segments.find((s) => s.toItemId === item.id);
                  return (
                    <li key={item.id}>
                      {idx > 0 && seg && (
                        <div className="tpSegment">
                          🚗 {seg.durationMin} {t({ en: "min", ar: "د" })} · {seg.distanceKm} {t({ en: "km", ar: "كم" })} {t(tp.planner.travel)}
                          {!seg.live && <span className="tpBadge tpBadgeDev">{t({ en: "estimated", ar: "تقديري" })}</span>}
                        </div>
                      )}
                      <SortableItem
                        item={item}
                        index={idx + 1}
                        selected={selectedId === item.id}
                        canEdit={canEdit}
                        days={bundle.days}
                        onSelect={() => { setSelectedId(item.id); }}
                        onPatch={patchItem}
                        onRemove={() => removeItem(item)}
                        onDuplicate={() => mutate(() => jpost(`/api/tp/trips/${tripId}/items/${item.id}`, { action: "duplicate" }))}
                        onMove={(toDayId) => mutate(() => jpost(`/api/tp/trips/${tripId}/items/${item.id}`, { dayId: toDayId }, "PATCH"))}
                      />
                    </li>
                  );
                })}
              </ol>
            </SortableContext>
          </DndContext>
          {segments.length > 0 && <p className="tpMuted" style={{ fontSize: "0.7rem" }}>{t({ en: "Travel times:", ar: "أزمنة التنقل:" })} {segSource}</p>}
        </section>

        {/* ── Side column: map + explore/ai ── */}
        <div className="tpSide">
          <div className={`tpMapBox ${mobileTab === "map" ? "" : show("map")}`}>
            <MapView points={mapPoints} selectedId={selectedId} onSelect={(id) => { setSelectedId(id); }} routeIds={dayItems.map((i) => i.id)} />
          </div>
          <div className={`tpCard tpPanel ${show("explore")}`}>
            <ExplorePanel tripId={tripId} bundle={bundle} dayId={dayId} canEdit={canEdit} onAdded={() => refresh(true)} />
          </div>
          <div className={`tpCard tpPanel ${show("ai")}`}>
            <AiPanel tripId={tripId} canEdit={canEdit} onProposal={(p) => setProposal(p)} onChanged={() => refresh(true)} />
          </div>
        </div>
      </div>

      {toast && (
        <div className="tpToast" role="status">
          <span>{toast.text}</span>
          {toast.undo && <button className="tpBtn tpBtnSm tpBtnGold" onClick={toast.undo}>{t(tp.planner.undo)}</button>}
          <button className="tpBtn tpBtnSm" onClick={() => setToast(null)} aria-label={t(tp.planner.cancel)}>✕</button>
        </div>
      )}
    </div>
  );
}

/* ── Sortable itinerary card ── */

function SortableItem({
  item, index, selected, canEdit, days, onSelect, onPatch, onRemove, onDuplicate, onMove,
}: {
  item: ItemDto; index: number; selected: boolean; canEdit: boolean;
  days: { id: string; dayIndex: number }[];
  onSelect: () => void;
  onPatch: (id: string, patch: Record<string, unknown>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (dayId: string) => void;
}) {
  const { t, lang } = useLang();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: !canEdit || item.locked });
  const [expanded, setExpanded] = useState(false);

  const catIcon: Record<string, string> = {
    restaurant: "🍽", cafe: "☕", hotel: "🏨", museum: "🏛", park: "🌳", beach: "🏖", shopping: "🛍",
    attraction: "📍", nature: "🌿", entertainment: "🎡", family: "👨‍👩‍👧", religious: "🕌", package: "★", transport: "🚗",
  };

  return (
    <div
      ref={setNodeRef}
      className={`tpItem ${selected ? "tpItemActive" : ""} ${item.locked ? "tpLocked" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      onClick={onSelect}
    >
      {canEdit && !item.locked && (
        <button className="tpDrag" {...attributes} {...listeners} aria-label={t({ en: `Reorder ${item.name}`, ar: `إعادة ترتيب ${item.name}` })}>
          ⠿
        </button>
      )}
      <div className="tpItemBody">
        <div className="tpItemName">
          <span aria-hidden="true">{catIcon[item.category] ?? "📍"}</span>
          <span style={{ textDecoration: item.completed ? "line-through" : "none", opacity: item.completed ? 0.6 : 1 }}>
            {index}. {item.name}
          </span>
          {item.locked && <span className="tpBadge">{t(tp.planner.locked)}</span>}
          {item.packageId && <span className="tpBadge tpBadgePkg">{t(tp.planner.companyPackage)}</span>}
          {item.source === "ai" && <span className="tpBadge tpBadgeDev">AI</span>}
        </div>
        <div className="tpItemMeta">
          {item.startTime && <span>🕐 {item.startTime}</span>}
          {item.durationMin && <span>{item.durationMin} {t({ en: "min", ar: "دقيقة" })}</span>}
          {item.cost != null && <span>{item.cost.toLocaleString(lang === "ar" ? "ar" : "en")} {item.currency ?? ""}</span>}
          {item.address && <span style={{ overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200, whiteSpace: "nowrap" }}>{item.address}</span>}
        </div>
        {canEdit && (
          <div className="tpItemActions">
            <button className="tpBtn tpBtnSm" onClick={(e) => { e.stopPropagation(); setExpanded((x) => !x); }} aria-expanded={expanded}>✎</button>
            <button className="tpBtn tpBtnSm" onClick={(e) => { e.stopPropagation(); onPatch(item.id, { locked: !item.locked }); }}>
              {item.locked ? t(tp.planner.unlock) : t(tp.planner.lock)}
            </button>
            <button className="tpBtn tpBtnSm" onClick={(e) => { e.stopPropagation(); onPatch(item.id, { completed: !item.completed }); }}>
              ✓ {t(tp.planner.completed)}
            </button>
            <button className="tpBtn tpBtnSm" onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>{t(tp.planner.duplicate)}</button>
            <select
              className="tpBtn tpBtnSm"
              aria-label={t(tp.planner.moveToDay)}
              value=""
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => e.target.value && onMove(e.target.value)}
              style={{ background: "rgba(9,18,45,0.5)" }}
            >
              <option value="">{t(tp.planner.moveToDay)}</option>
              {days.filter((d) => d.id !== item.dayId).map((d) => (
                <option key={d.id} value={d.id}>{t(tp.planner.day)} {d.dayIndex + 1}</option>
              ))}
            </select>
            {!item.locked && (
              <button className="tpBtn tpBtnSm tpBtnDanger" onClick={(e) => { e.stopPropagation(); onRemove(); }}>{t(tp.planner.remove)}</button>
            )}
          </div>
        )}
        {expanded && canEdit && (
          <div style={{ marginTop: "0.6rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.5rem" }} onClick={(e) => e.stopPropagation()}>
            <label className="tpMuted" style={{ fontSize: "0.7rem" }}>
              {t({ en: "Start", ar: "البداية" })}
              <input type="time" defaultValue={item.startTime ?? ""} onBlur={(e) => onPatch(item.id, { startTime: e.target.value || null })} style={{ width: "100%", minHeight: 36, background: "rgba(3,6,17,0.6)", border: "1px solid rgba(115,85,216,0.35)", borderRadius: 8, color: "var(--ivory)", padding: "0.3rem" }} />
            </label>
            <label className="tpMuted" style={{ fontSize: "0.7rem" }}>
              {t({ en: "Duration (min)", ar: "المدة (د)" })}
              <input type="number" min={5} defaultValue={item.durationMin ?? ""} onBlur={(e) => onPatch(item.id, { durationMin: e.target.value ? Number(e.target.value) : null })} style={{ width: "100%", minHeight: 36, background: "rgba(3,6,17,0.6)", border: "1px solid rgba(115,85,216,0.35)", borderRadius: 8, color: "var(--ivory)", padding: "0.3rem" }} />
            </label>
            <label className="tpMuted" style={{ fontSize: "0.7rem" }}>
              {t({ en: "Cost", ar: "التكلفة" })}
              <input type="number" min={0} defaultValue={item.cost ?? ""} onBlur={(e) => onPatch(item.id, { cost: e.target.value ? Number(e.target.value) : null })} style={{ width: "100%", minHeight: 36, background: "rgba(3,6,17,0.6)", border: "1px solid rgba(115,85,216,0.35)", borderRadius: 8, color: "var(--ivory)", padding: "0.3rem" }} />
            </label>
            <label className="tpMuted" style={{ fontSize: "0.7rem", gridColumn: "1 / -1" }}>
              {t({ en: "Notes", ar: "ملاحظات" })}
              <input type="text" defaultValue={item.notes ?? ""} onBlur={(e) => onPatch(item.id, { notes: e.target.value || null })} style={{ width: "100%", minHeight: 36, background: "rgba(3,6,17,0.6)", border: "1px solid rgba(115,85,216,0.35)", borderRadius: 8, color: "var(--ivory)", padding: "0.3rem" }} />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Add custom activity ── */

function AddActivity({ tripId, dayId, onDone }: { tripId: string; dayId: string | null; onDone: () => void }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  if (!open) {
    return <button className="tpBtn tpBtnSm tpBtnGold" onClick={() => setOpen(true)}>+ {t(tp.planner.addActivity)}</button>;
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setBusy(true);
        try {
          await jpost(`/api/tp/trips/${tripId}/items`, { name: name.trim(), dayId, category: "custom" });
          setName("");
          setOpen(false);
          onDone();
        } finally {
          setBusy(false);
        }
      }}
      style={{ display: "flex", gap: 6 }}
    >
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t(tp.planner.addActivity)} maxLength={160}
        style={{ minHeight: 40, background: "rgba(3,6,17,0.6)", border: "1px solid rgba(115,85,216,0.4)", borderRadius: 8, color: "var(--ivory)", padding: "0 0.7rem" }} />
      <button className="tpBtn tpBtnSm tpBtnGold" disabled={busy} type="submit">✓</button>
      <button className="tpBtn tpBtnSm" type="button" onClick={() => setOpen(false)}>✕</button>
    </form>
  );
}

/* ── Explore panel ── */

function ExplorePanel({ tripId, bundle, dayId, canEdit, onAdded }: { tripId: string; bundle: TripBundle; dayId: string | null; canEdit: boolean; onAdded: () => void }) {
  const { t } = useLang();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [results, setResults] = useState<PlaceDto[] | null>(null);
  const [packages, setPackages] = useState<PlaceDto[]>([]);
  const [live, setLive] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const destination = bundle.destinations[0]?.name ?? "";

  const search = useCallback((query: string, cat: string) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (cat) params.set("category", cat);
    if (destination) params.set("destination", destination);
    api<{ results: PlaceDto[]; packages: PlaceDto[]; liveData: boolean }>(`/api/tp/places?${params}`)
      .then((d) => {
        setResults(d.results);
        setPackages(d.packages);
        setLive(d.liveData);
      })
      .catch(() => setResults([]));
  }, [destination]);

  useEffect(() => { search("", ""); }, [search]);

  const onQ = (v: string) => {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(v, category), 350); // debounced
  };

  const add = async (p: PlaceDto) => {
    setBusyId(p.placeId);
    try {
      await jpost(`/api/tp/trips/${tripId}/items`, {
        dayId, placeId: p.placeId, name: p.name, category: p.category === "package" ? "package" : p.category,
        address: p.address || null, lat: p.lat || null, lng: p.lng || null,
        source: p.packageId ? "package" : "discovery", packageId: p.packageId ?? null,
      });
      onAdded();
    } finally {
      setBusyId(null);
    }
  };

  const cats = ["", "attraction", "restaurant", "cafe", "hotel", "museum", "park", "shopping", "family"];

  return (
    <div>
      <h3 className="serif" style={{ color: "var(--white)", marginBottom: "0.6rem" }}>{t(tp.planner.explore)}</h3>
      <input
        value={q}
        onChange={(e) => onQ(e.target.value)}
        placeholder={t(tp.planner.searchPlaces)}
        aria-label={t(tp.planner.searchPlaces)}
        style={{ width: "100%", minHeight: 42, background: "rgba(3,6,17,0.6)", border: "1px solid rgba(115,85,216,0.4)", borderRadius: 10, color: "var(--ivory)", padding: "0 0.8rem", marginBottom: "0.6rem" }}
      />
      <div className="tpChips" style={{ marginBottom: "0.7rem" }}>
        {cats.map((c) => (
          <button key={c || "all"} className="tpChip" aria-pressed={category === c} onClick={() => { setCategory(c); search(q, c); }}>
            {c === "" ? t({ en: "All", ar: "الكل" }) : c}
          </button>
        ))}
      </div>
      {!live && <p className="tpBadge tpBadgeDev" style={{ display: "inline-block", marginBottom: "0.6rem" }}>{t(tp.planner.devData)}</p>}

      {packages.length > 0 && packages.map((p) => (
        <div key={p.placeId} className="tpItem">
          <div className="tpItemBody">
            <div className="tpItemName">★ {p.name} <span className="tpBadge tpBadgePkg">{t(tp.planner.companyPackage)}</span></div>
            <div className="tpItemMeta"><span>{p.address}</span><span>{p.summary}</span></div>
            {p.inclusions && <div className="tpItemMeta">{p.inclusions.slice(0, 3).join(" · ")}</div>}
            {canEdit && (
              <div className="tpItemActions">
                <button className="tpBtn tpBtnSm tpBtnGold" disabled={busyId === p.placeId} onClick={() => add(p)}>{t(tp.planner.addToDay)}</button>
                <Link className="tpBtn tpBtnSm" href="/#trips">{t({ en: "Details", ar: "التفاصيل" })}</Link>
              </div>
            )}
          </div>
        </div>
      ))}

      {results === null && <div className="tpSkeleton" />}
      {results?.length === 0 && <div className="tpEmpty">{t(tp.planner.noResults)}</div>}
      {results?.map((p) => (
        <div key={p.placeId} className="tpItem">
          <div className="tpItemBody">
            <div className="tpItemName">{p.name}</div>
            <div className="tpItemMeta">
              {p.rating != null && <span>★ {p.rating}</span>}
              {p.priceLevel != null && <span>{"$".repeat(Math.max(1, p.priceLevel))}</span>}
              <span>{p.category}</span>
              <span style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.address}</span>
            </div>
            {p.summary && <div className="tpItemMeta">{p.summary}</div>}
            {canEdit && (
              <div className="tpItemActions">
                <button className="tpBtn tpBtnSm tpBtnGold" disabled={busyId === p.placeId} onClick={() => add(p)}>{t(tp.planner.addToDay)}</button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── AI panel ── */

interface ChatMsg { role: "user" | "assistant"; text: string }

function AiPanel({ tripId, canEdit, onProposal, onChanged }: { tripId: string; canEdit: boolean; onProposal: (p: ProposalDto) => void; onChanged: () => void }) {
  const { t } = useLang();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const convRef = useRef<string | undefined>(undefined);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<{ conversationId: string | null; messages: { role: "user" | "assistant"; content: unknown }[] }>(`/api/tp/trips/${tripId}/ai`)
      .then((d) => {
        convRef.current = d.conversationId ?? undefined;
        setMsgs(d.messages.map((m) => ({ role: m.role, text: String(m.content) })));
      })
      .catch(() => {});
  }, [tripId]);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
  }, [msgs]);

  async function send() {
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    setBusy(true);
    setMsgs((m) => [...m, { role: "user", text: message }, { role: "assistant", text: "" }]);
    try {
      const res = await fetch(`/api/tp/trips/${tripId}/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId: convRef.current }),
      });
      if (!res.ok || !res.body) throw new Error("assistant_unavailable");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let ev: { type: string; delta?: string; conversationId?: string; message?: string; proposalId?: string };
          try { ev = JSON.parse(line); } catch { continue; }
          if (ev.type === "meta" && ev.conversationId) convRef.current = ev.conversationId;
          if (ev.type === "text" && ev.delta) {
            setMsgs((m) => {
              const copy = [...m];
              copy[copy.length - 1] = { role: "assistant", text: copy[copy.length - 1].text + ev.delta };
              return copy;
            });
          }
          if (ev.type === "notice" && ev.message) setNotice(ev.message);
          if (ev.type === "error" && ev.message) setNotice(ev.message);
          if (ev.type === "proposal" && ev.proposalId) {
            const p = await api<{ proposal: ProposalDto }>(`/api/tp/trips/${tripId}/proposals/${ev.proposalId}`);
            onProposal(p.proposal);
            onChanged();
          }
        }
      }
    } catch {
      setNotice(t({ en: "The assistant is temporarily unavailable.", ar: "المساعد غير متاح مؤقتًا." }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 260 }}>
      <h3 className="serif" style={{ color: "var(--white)", marginBottom: "0.4rem" }}>{t(tp.planner.assistant)}</h3>
      <p className="tpMuted" style={{ fontSize: "0.7rem", marginBottom: "0.6rem" }}>{t(tp.planner.aiDisclaimer)}</p>
      {notice && <p className="tpBadge tpBadgeDev" style={{ marginBottom: "0.5rem" }}>{notice}</p>}
      <div ref={boxRef} className="tpChat" style={{ flex: 1, overflow: "auto", marginBottom: "0.6rem" }} aria-live="polite">
        {msgs.length === 0 && (
          <div className="tpEmpty" style={{ padding: "1.2rem" }}>
            {t({ en: 'Try: "Create a 3-day family itinerary" or "Make day 2 less busy."', ar: "جرّب: «أنشئ برنامجًا عائليًا لثلاثة أيام» أو «خفف يوم ٢»." })}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`tpMsg ${m.role === "user" ? "tpMsgUser" : "tpMsgAi"}`}>{m.text || (busy && i === msgs.length - 1 ? "…" : "")}</div>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{ display: "flex", gap: 6 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t(tp.planner.askAnything)}
          aria-label={t(tp.planner.askAnything)}
          disabled={!canEdit || busy}
          style={{ flex: 1, minHeight: 44, background: "rgba(3,6,17,0.6)", border: "1px solid rgba(115,85,216,0.4)", borderRadius: 10, color: "var(--ivory)", padding: "0 0.8rem" }}
        />
        <button className="tpBtn tpBtnGold" disabled={!canEdit || busy || !input.trim()} type="submit">
          {busy ? "…" : "➤"}
        </button>
      </form>
    </div>
  );
}

/* ── Proposal preview card ── */

function ProposalCard({ p, bundle, onResolve, disabled }: { p: ProposalDto; bundle: TripBundle; onResolve: (id: string, a: "apply" | "reject") => void; disabled: boolean }) {
  const { t } = useLang();
  const nameOf = (id: string) => bundle.items.find((i) => i.id === id)?.name ?? id.slice(0, 8);
  const impact = (p.impact ?? {}) as { totalTravelMin?: number; conflicts?: string[]; estimatedAddedCost?: number };
  return (
    <div className="tpProposal" style={{ marginBottom: "1rem" }} role="region" aria-label={t(tp.planner.proposalTitle)}>
      <strong style={{ color: "var(--gold-light)" }}>✦ {t(tp.planner.proposalTitle)}</strong>
      <p style={{ color: "var(--ivory)", fontSize: "0.9rem", marginTop: 4 }}>{p.summary}</p>
      <ul>
        {p.changes.adds.map((a, i) => <li key={`a${i}`}>＋ {(a as { name?: string }).name}{a.dayIndex != null ? ` → ${t(tp.planner.day)} ${Number(a.dayIndex) + 1}` : ""}</li>)}
        {p.changes.removes.map((r, i) => <li key={`r${i}`}>－ {nameOf(r.itemId)}{r.reason ? ` (${r.reason})` : ""}</li>)}
        {p.changes.moves.map((m, i) => <li key={`m${i}`}>→ {nameOf(m.itemId)} → {t(tp.planner.day)} {m.toDayIndex + 1}</li>)}
        {p.changes.updates.length > 0 && <li>✎ {p.changes.updates.length} {t({ en: "schedule updates", ar: "تحديثات جدولة" })}</li>}
      </ul>
      {impact.totalTravelMin != null && <p className="tpMuted" style={{ fontSize: "0.75rem" }}>{t(tp.planner.travel)}: ~{impact.totalTravelMin} {t({ en: "min", ar: "د" })}</p>}
      {impact.estimatedAddedCost ? <p className="tpMuted" style={{ fontSize: "0.75rem" }}>+{impact.estimatedAddedCost} {bundle.trip.currency}</p> : null}
      {impact.conflicts && impact.conflicts.length > 0 && (
        <p className="tpErr">{t(tp.planner.conflicts)}: {impact.conflicts.join(" · ")}</p>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button className="tpBtn tpBtnSm tpBtnGold" disabled={disabled} onClick={() => onResolve(p.id, "apply")}>{t(tp.planner.apply)}</button>
        <button className="tpBtn tpBtnSm" disabled={disabled} onClick={() => onResolve(p.id, "reject")}>{t(tp.planner.cancel)}</button>
      </div>
    </div>
  );
}
