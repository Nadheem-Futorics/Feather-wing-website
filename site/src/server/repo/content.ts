import { db, nowIso, uid } from "../db";
import { HttpError } from "../authz";
import { trips as staticTrips } from "@/data/trips";
import type { z } from "zod";
import type { featuredTripSchema, offerSchema, kbArticleSchema } from "../schemas";

/* ── Seeding (runs once, from the static homepage data) ── */

export function seedContent() {
  const d = db();
  const t = d.prepare("SELECT COUNT(*) AS n FROM featured_trips").get() as { n: number };
  if (t.n === 0) {
    const ins = d.prepare(
      `INSERT INTO featured_trips (id, scene, hue, title_en, title_ar, place_en, place_ar, dates_en, dates_ar,
        duration_en, duration_ar, price, seats, category, sort_order, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
    );
    const now = nowIso();
    staticTrips.forEach((tr, i) => {
      ins.run(tr.id, tr.scene, tr.hue, tr.title.en, tr.title.ar, tr.place.en, tr.place.ar, tr.dates.en, tr.dates.ar,
        tr.duration.en, tr.duration.ar, tr.price, tr.seats, tr.category, i, now, now);
    });
  }
  const o = d.prepare("SELECT COUNT(*) AS n FROM offers").get() as { n: number };
  if (o.n === 0) {
    // One example offer so the homepage box has content out of the box (clearly editable).
    d.prepare(
      `INSERT INTO offers (id, scene, title_en, title_ar, subtitle_en, subtitle_ar, description_en, description_ar,
        badge_en, badge_ar, price_from, cta_en, cta_ar, cta_href, valid_until, sort_order, active, created_at, updated_at)
       VALUES (?, 'dunes', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '#enquiry', ?, 0, 1, ?, ?)`
    ).run(
      uid(),
      "Early-Bird Desert Escape", "عرض الحجز المبكر — رحلة صحراوية",
      "Save on 3-night desert experiences", "وفّر على تجارب صحراوية لثلاث ليالٍ",
      "Book early and enjoy a guided desert drive, premium camping under the stars, and full-board dining. Limited seats each season.",
      "احجز مبكرًا واستمتع بقيادة صحراوية مع مرشد، وتخييم فاخر تحت النجوم، وإقامة كاملة. المقاعد محدودة كل موسم.",
      "Limited offer", "عرض محدود",
      "SAR —",
      "Enquire now", "استفسر الآن",
      "Seasonal — dates on request", nowIso(), nowIso()
    );
  }
}

/* ── Featured trips ── */

interface TripRow {
  id: string; scene: string; hue: string; title_en: string; title_ar: string; place_en: string; place_ar: string;
  dates_en: string | null; dates_ar: string | null; duration_en: string | null; duration_ar: string | null;
  price: string | null; seats: number; category: string; sort_order: number; active: number;
}

function tripDto(r: TripRow) {
  return {
    id: r.id, scene: r.scene, hue: r.hue,
    title: { en: r.title_en, ar: r.title_ar },
    place: { en: r.place_en, ar: r.place_ar },
    dates: { en: r.dates_en ?? "", ar: r.dates_ar ?? "" },
    duration: { en: r.duration_en ?? "", ar: r.duration_ar ?? "" },
    price: r.price ?? "", seats: r.seats, category: r.category, active: !!r.active, sortOrder: r.sort_order,
  };
}

export function listFeaturedTrips(includeInactive = false) {
  seedContent();
  const rows = (includeInactive
    ? db().prepare("SELECT * FROM featured_trips ORDER BY sort_order, created_at").all()
    : db().prepare("SELECT * FROM featured_trips WHERE active = 1 ORDER BY sort_order, created_at").all()) as unknown as TripRow[];
  return rows.map(tripDto);
}

export function createFeaturedTrip(input: z.infer<typeof featuredTripSchema>) {
  const id = uid();
  const now = nowIso();
  const max = db().prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM featured_trips").get() as { m: number };
  db().prepare(
    `INSERT INTO featured_trips (id, scene, hue, title_en, title_ar, place_en, place_ar, dates_en, dates_ar,
      duration_en, duration_ar, price, seats, category, sort_order, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).run(id, input.scene, input.hue, input.titleEn, input.titleAr, input.placeEn, input.placeAr,
    input.datesEn ?? null, input.datesAr ?? null, input.durationEn ?? null, input.durationAr ?? null,
    input.price ?? null, input.seats, input.category, max.m + 1, now, now);
  return id;
}

export function updateFeaturedTrip(id: string, input: Partial<z.infer<typeof featuredTripSchema>> & { active?: boolean }) {
  const map: Record<string, string> = {
    scene: "scene", hue: "hue", titleEn: "title_en", titleAr: "title_ar", placeEn: "place_en", placeAr: "place_ar",
    datesEn: "dates_en", datesAr: "dates_ar", durationEn: "duration_en", durationAr: "duration_ar",
    price: "price", seats: "seats", category: "category",
  };
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [k, col] of Object.entries(map)) {
    if (k in input) { sets.push(`${col} = ?`); vals.push((input as Record<string, unknown>)[k] ?? null); }
  }
  if ("active" in input) { sets.push("active = ?"); vals.push(input.active ? 1 : 0); }
  if (!sets.length) return;
  sets.push("updated_at = ?");
  vals.push(nowIso(), id);
  const r = db().prepare(`UPDATE featured_trips SET ${sets.join(", ")} WHERE id = ?`).run(...(vals as never[]));
  if (Number(r.changes) === 0) throw new HttpError(404, "not_found");
}

export function deleteFeaturedTrip(id: string) {
  const r = db().prepare("DELETE FROM featured_trips WHERE id = ?").run(id);
  if (Number(r.changes) === 0) throw new HttpError(404, "not_found");
}

/* ── Offers ── */

interface OfferRow {
  id: string; scene: string; title_en: string; title_ar: string; subtitle_en: string | null; subtitle_ar: string | null;
  description_en: string | null; description_ar: string | null; badge_en: string | null; badge_ar: string | null;
  price_from: string | null; cta_en: string | null; cta_ar: string | null; cta_href: string; valid_until: string | null;
  sort_order: number; active: number;
}

function offerDto(r: OfferRow) {
  return {
    id: r.id, scene: r.scene,
    title: { en: r.title_en, ar: r.title_ar },
    subtitle: { en: r.subtitle_en ?? "", ar: r.subtitle_ar ?? "" },
    description: { en: r.description_en ?? "", ar: r.description_ar ?? "" },
    badge: { en: r.badge_en ?? "", ar: r.badge_ar ?? "" },
    priceFrom: r.price_from ?? "",
    cta: { en: r.cta_en ?? "", ar: r.cta_ar ?? "" },
    ctaHref: r.cta_href,
    validUntil: r.valid_until ?? "",
    active: !!r.active, sortOrder: r.sort_order,
  };
}

export function listOffers(includeInactive = false) {
  seedContent();
  const rows = (includeInactive
    ? db().prepare("SELECT * FROM offers ORDER BY sort_order, created_at").all()
    : db().prepare("SELECT * FROM offers WHERE active = 1 ORDER BY sort_order, created_at").all()) as unknown as OfferRow[];
  return rows.map(offerDto);
}

export function createOffer(input: z.infer<typeof offerSchema>) {
  const id = uid();
  const now = nowIso();
  const max = db().prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM offers").get() as { m: number };
  db().prepare(
    `INSERT INTO offers (id, scene, title_en, title_ar, subtitle_en, subtitle_ar, description_en, description_ar,
      badge_en, badge_ar, price_from, cta_en, cta_ar, cta_href, valid_until, sort_order, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).run(id, input.scene, input.titleEn, input.titleAr, input.subtitleEn ?? null, input.subtitleAr ?? null,
    input.descriptionEn ?? null, input.descriptionAr ?? null, input.badgeEn ?? null, input.badgeAr ?? null,
    input.priceFrom ?? null, input.ctaEn ?? null, input.ctaAr ?? null, input.ctaHref, input.validUntil ?? null, max.m + 1, now, now);
  return id;
}

export function updateOffer(id: string, input: Partial<z.infer<typeof offerSchema>> & { active?: boolean }) {
  const map: Record<string, string> = {
    scene: "scene", titleEn: "title_en", titleAr: "title_ar", subtitleEn: "subtitle_en", subtitleAr: "subtitle_ar",
    descriptionEn: "description_en", descriptionAr: "description_ar", badgeEn: "badge_en", badgeAr: "badge_ar",
    priceFrom: "price_from", ctaEn: "cta_en", ctaAr: "cta_ar", ctaHref: "cta_href", validUntil: "valid_until",
  };
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [k, col] of Object.entries(map)) {
    if (k in input) { sets.push(`${col} = ?`); vals.push((input as Record<string, unknown>)[k] ?? null); }
  }
  if ("active" in input) { sets.push("active = ?"); vals.push(input.active ? 1 : 0); }
  if (!sets.length) return;
  sets.push("updated_at = ?");
  vals.push(nowIso(), id);
  const r = db().prepare(`UPDATE offers SET ${sets.join(", ")} WHERE id = ?`).run(...(vals as never[]));
  if (Number(r.changes) === 0) throw new HttpError(404, "not_found");
}

export function deleteOffer(id: string) {
  const r = db().prepare("DELETE FROM offers WHERE id = ?").run(id);
  if (Number(r.changes) === 0) throw new HttpError(404, "not_found");
}

/* ── Knowledge base (grounds the concierge AI) ── */

interface KbRow {
  id: string; category: string; title_en: string; title_ar: string; content_en: string; content_ar: string;
  sort_order: number; active: number;
}

function kbDto(r: KbRow) {
  return {
    id: r.id, category: r.category,
    title: { en: r.title_en, ar: r.title_ar },
    content: { en: r.content_en, ar: r.content_ar },
    active: !!r.active, sortOrder: r.sort_order,
  };
}

export function listKbArticles(includeInactive = false) {
  const rows = (includeInactive
    ? db().prepare("SELECT * FROM kb_articles ORDER BY sort_order, created_at").all()
    : db().prepare("SELECT * FROM kb_articles WHERE active = 1 ORDER BY sort_order, created_at").all()) as unknown as KbRow[];
  return rows.map(kbDto);
}

export function createKbArticle(input: z.infer<typeof kbArticleSchema>) {
  const id = uid();
  const now = nowIso();
  const max = db().prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM kb_articles").get() as { m: number };
  db().prepare(
    `INSERT INTO kb_articles (id, category, title_en, title_ar, content_en, content_ar, sort_order, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).run(id, input.category, input.titleEn, input.titleAr, input.contentEn, input.contentAr, max.m + 1, now, now);
  return id;
}

export function updateKbArticle(id: string, input: Partial<z.infer<typeof kbArticleSchema>> & { active?: boolean }) {
  const map: Record<string, string> = {
    category: "category", titleEn: "title_en", titleAr: "title_ar", contentEn: "content_en", contentAr: "content_ar",
  };
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [k, col] of Object.entries(map)) {
    if (k in input) { sets.push(`${col} = ?`); vals.push((input as Record<string, unknown>)[k] ?? null); }
  }
  if ("active" in input) { sets.push("active = ?"); vals.push(input.active ? 1 : 0); }
  if (!sets.length) return;
  sets.push("updated_at = ?");
  vals.push(nowIso(), id);
  const r = db().prepare(`UPDATE kb_articles SET ${sets.join(", ")} WHERE id = ?`).run(...(vals as never[]));
  if (Number(r.changes) === 0) throw new HttpError(404, "not_found");
}

export function deleteKbArticle(id: string) {
  const r = db().prepare("DELETE FROM kb_articles WHERE id = ?").run(id);
  if (Number(r.changes) === 0) throw new HttpError(404, "not_found");
}
