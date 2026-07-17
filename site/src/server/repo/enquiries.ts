import { db, nowIso, uid, fromJson, asJson } from "../db";
import { HttpError } from "../authz";
import type { z } from "zod";
import type { quoteCreateSchema } from "../schemas";

export function listPackages(category?: string) {
  const rows = (category
    ? db().prepare("SELECT * FROM company_packages WHERE active = 1 AND category = ?").all(category)
    : db().prepare("SELECT * FROM company_packages WHERE active = 1").all()) as {
    id: string; title_en: string; title_ar: string; place_en: string | null; place_ar: string | null; category: string | null;
    duration_en: string | null; duration_ar: string | null; price_display: string | null; lat: number | null; lng: number | null;
    inclusions: string | null; exclusions: string | null;
  }[];
  return rows.map((r) => ({
    id: r.id,
    title: { en: r.title_en, ar: r.title_ar },
    place: { en: r.place_en ?? "", ar: r.place_ar ?? "" },
    category: r.category,
    duration: { en: r.duration_en ?? "", ar: r.duration_ar ?? "" },
    priceDisplay: r.price_display,
    lat: r.lat,
    lng: r.lng,
    inclusions: fromJson<string[]>(r.inclusions, []),
    exclusions: fromJson<string[]>(r.exclusions, []),
  }));
}

export function getPackage(id: string) {
  const p = listPackages().find((x) => x.id === id);
  if (!p) throw new HttpError(404, "not_found", "Package not found");
  return p;
}

function makeReference(): string {
  const n = Math.floor(Math.random() * 9000) + 1000;
  return `FWT-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${n}`;
}

export function createQuoteEnquiry(
  input: z.infer<typeof quoteCreateSchema>,
  tripId: string | null,
  tripSummary: unknown
): { id: string; reference: string } {
  const id = uid();
  const reference = makeReference();
  const now = nowIso();
  db().prepare(
    `INSERT INTO quote_enquiries (id, reference, trip_id, customer_name, email, phone, whatsapp, contact_method, nationality,
      departure_city, travelers, dates_flexible, budget, currency, accommodation, needs_flights, needs_visa, needs_insurance,
      needs_transfer, notes, trip_summary, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`
  ).run(
    id, reference, tripId, input.customerName, input.email, input.phone ?? null, input.whatsapp ?? null,
    input.contactMethod, input.nationality ?? null, input.departureCity ?? null, input.travelers ?? null,
    input.datesFlexible ? 1 : 0, input.budget ?? null, input.currency ?? null, input.accommodation ?? null,
    input.needsFlights ? 1 : 0, input.needsVisa ? 1 : 0, input.needsInsurance ? 1 : 0, input.needsTransfer ? 1 : 0,
    input.notes ?? null, asJson(tripSummary), now, now
  );
  return { id, reference };
}

export function listEnquiries() {
  return (db().prepare("SELECT id, reference, customer_name, email, travelers, budget, currency, status, created_at, trip_id FROM quote_enquiries ORDER BY created_at DESC").all() as {
    id: string; reference: string; customer_name: string; email: string; travelers: number | null; budget: number | null;
    currency: string | null; status: string; created_at: string; trip_id: string | null;
  }[]).map((r) => ({
    id: r.id, reference: r.reference, customerName: r.customer_name, email: r.email, travelers: r.travelers,
    budget: r.budget, currency: r.currency, status: r.status, createdAt: r.created_at, tripId: r.trip_id,
  }));
}

export function getEnquiry(id: string) {
  const r = db().prepare("SELECT * FROM quote_enquiries WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!r) throw new HttpError(404, "not_found");
  return {
    id: r.id, reference: r.reference, tripId: r.trip_id, customerName: r.customer_name, email: r.email, phone: r.phone,
    whatsapp: r.whatsapp, contactMethod: r.contact_method, nationality: r.nationality, departureCity: r.departure_city,
    travelers: r.travelers, datesFlexible: !!r.dates_flexible, budget: r.budget, currency: r.currency,
    accommodation: r.accommodation, needsFlights: !!r.needs_flights, needsVisa: !!r.needs_visa,
    needsInsurance: !!r.needs_insurance, needsTransfer: !!r.needs_transfer, notes: r.notes,
    tripSummary: fromJson<unknown>(r.trip_summary, null), status: r.status, adminNotes: r.admin_notes, createdAt: r.created_at,
  };
}

export function updateEnquiryStatus(id: string, status: string, adminNotes?: string) {
  const r = db().prepare("UPDATE quote_enquiries SET status = ?, admin_notes = COALESCE(?, admin_notes), updated_at = ? WHERE id = ?")
    .run(status, adminNotes ?? null, nowIso(), id);
  if (Number(r.changes) === 0) throw new HttpError(404, "not_found");
}
