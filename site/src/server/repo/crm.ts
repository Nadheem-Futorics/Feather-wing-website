import { db, nowIso, uid } from "../db";
import { HttpError } from "../authz";
import type { z } from "zod";
import type { generalEnquiryCreateSchema } from "../schemas";

interface GeneralEnquiryRow {
  id: string; name: string; email: string; mobile: string; service: string; destination: string | null;
  departure: string | null; travel_date: string | null; travellers: string | null; contact_method: string | null;
  notes: string | null; status: string; admin_notes: string | null; created_at: string; updated_at: string;
}

function generalEnquiryDto(r: GeneralEnquiryRow) {
  return {
    id: r.id, name: r.name, email: r.email, mobile: r.mobile, service: r.service, destination: r.destination,
    departure: r.departure, travelDate: r.travel_date, travellers: r.travellers, contactMethod: r.contact_method,
    notes: r.notes, status: r.status, adminNotes: r.admin_notes, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}
export type GeneralEnquiryDto = ReturnType<typeof generalEnquiryDto>;

/** Persists a homepage contact-form submission — the CRM's lead inbox. */
export function createGeneralEnquiry(input: z.infer<typeof generalEnquiryCreateSchema>): { id: string } {
  const id = uid();
  const now = nowIso();
  db().prepare(
    `INSERT INTO general_enquiries (id, name, email, mobile, service, destination, departure, travel_date,
      travellers, contact_method, notes, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`
  ).run(
    id, input.name, input.email, input.mobile, input.service, input.destination ?? null, input.departure ?? null,
    input.travelDate ?? null, input.travellers ?? null, input.contactMethod ?? null, input.notes ?? null, now, now
  );
  return { id };
}

export function listGeneralEnquiries(): GeneralEnquiryDto[] {
  return (db().prepare("SELECT * FROM general_enquiries ORDER BY created_at DESC").all() as unknown as GeneralEnquiryRow[]).map(generalEnquiryDto);
}

export function getGeneralEnquiry(id: string): GeneralEnquiryDto {
  const r = db().prepare("SELECT * FROM general_enquiries WHERE id = ?").get(id) as GeneralEnquiryRow | undefined;
  if (!r) throw new HttpError(404, "not_found", "Enquiry not found");
  return generalEnquiryDto(r);
}

export function updateGeneralEnquiryStatus(id: string, status: string, adminNotes?: string): void {
  const r = db()
    .prepare("UPDATE general_enquiries SET status = ?, admin_notes = COALESCE(?, admin_notes), updated_at = ? WHERE id = ?")
    .run(status, adminNotes ?? null, nowIso(), id);
  if (Number(r.changes) === 0) throw new HttpError(404, "not_found");
}

export interface CrmLead {
  id: string;
  source: "enquiry" | "quote" | "meeting";
  name: string;
  email: string | null;
  phone: string | null;
  subject: string;
  status: string;
  createdAt: string;
}

/** Unified lead feed for the CRM dashboard — pulls homepage enquiries, trip-planner quote requests, and scheduled meetings into one pipeline view. */
export function listCrmLeads(): CrmLead[] {
  const enquiries = (db().prepare("SELECT id, name, email, mobile, service, status, created_at FROM general_enquiries").all() as {
    id: string; name: string; email: string; mobile: string; service: string; status: string; created_at: string;
  }[]).map((r): CrmLead => ({ id: r.id, source: "enquiry", name: r.name, email: r.email, phone: r.mobile, subject: r.service, status: r.status, createdAt: r.created_at }));

  const quotes = (db().prepare("SELECT id, customer_name, email, phone, reference, status, created_at FROM quote_enquiries").all() as {
    id: string; customer_name: string; email: string; phone: string | null; reference: string; status: string; created_at: string;
  }[]).map((r): CrmLead => ({ id: r.id, source: "quote", name: r.customer_name, email: r.email, phone: r.phone, subject: `Quote ${r.reference}`, status: r.status, createdAt: r.created_at }));

  const meetings = (db().prepare("SELECT id, customer_name, email, phone, title, status, created_at FROM meetings").all() as {
    id: string; customer_name: string; email: string | null; phone: string | null; title: string; status: string; created_at: string;
  }[]).map((r): CrmLead => ({ id: r.id, source: "meeting", name: r.customer_name, email: r.email, phone: r.phone, subject: r.title, status: r.status, createdAt: r.created_at }));

  return [...enquiries, ...quotes, ...meetings].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
