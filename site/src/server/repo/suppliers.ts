import { db, nowIso, uid } from "../db";
import { HttpError } from "../authz";
import type { z } from "zod";
import type { supplierSchema, supplierRateSchema } from "../schemas";

interface SupplierRow {
  id: string; category: string; subtype: string | null; name: string; city: string | null; country: string | null;
  contact_name: string | null; phone: string | null; email: string | null; whatsapp: string | null; website: string | null;
  payment_terms: string | null; cancellation_policy: string | null; notes: string | null; rating: number | null;
  status: string; created_at: string; updated_at: string;
}

function supplierDto(r: SupplierRow) {
  return {
    id: r.id, category: r.category, subtype: r.subtype, name: r.name, city: r.city, country: r.country,
    contactName: r.contact_name, phone: r.phone, email: r.email, whatsapp: r.whatsapp, website: r.website,
    paymentTerms: r.payment_terms, cancellationPolicy: r.cancellation_policy, notes: r.notes, rating: r.rating,
    status: r.status, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}
export type SupplierDto = ReturnType<typeof supplierDto>;

interface RateRow {
  id: string; supplier_id: string; service_name: string; unit: string; currency: string; adult_cost: number | null;
  child_cost: number | null; valid_from: string | null; valid_to: string | null; notes: string | null;
  active: number; created_at: string; updated_at: string;
}

function rateDto(r: RateRow) {
  const today = nowIso().slice(0, 10);
  return {
    id: r.id, supplierId: r.supplier_id, serviceName: r.service_name, unit: r.unit, currency: r.currency,
    adultCost: r.adult_cost, childCost: r.child_cost, validFrom: r.valid_from, validTo: r.valid_to, notes: r.notes,
    active: !!r.active, expired: !!r.valid_to && r.valid_to < today, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}
export type RateDto = ReturnType<typeof rateDto>;

export function listSuppliers(includeInactive = false): SupplierDto[] {
  const rows = (includeInactive
    ? db().prepare("SELECT * FROM suppliers ORDER BY name").all()
    : db().prepare("SELECT * FROM suppliers WHERE status != 'inactive' ORDER BY name").all()) as unknown as SupplierRow[];
  return rows.map(supplierDto);
}

export function getSupplier(id: string): SupplierDto {
  const r = db().prepare("SELECT * FROM suppliers WHERE id = ?").get(id) as SupplierRow | undefined;
  if (!r) throw new HttpError(404, "not_found", "Supplier not found");
  return supplierDto(r);
}

export function createSupplier(input: z.infer<typeof supplierSchema>): string {
  const id = uid();
  const now = nowIso();
  db().prepare(
    `INSERT INTO suppliers (id, category, subtype, name, city, country, contact_name, phone, email, whatsapp,
      website, payment_terms, cancellation_policy, notes, rating, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, input.category, input.subtype ?? null, input.name, input.city ?? null, input.country ?? null,
    input.contactName ?? null, input.phone ?? null, input.email || null, input.whatsapp ?? null, input.website ?? null,
    input.paymentTerms ?? null, input.cancellationPolicy ?? null, input.notes ?? null, input.rating ?? null,
    input.status ?? "active", now, now
  );
  return id;
}

export function updateSupplier(id: string, input: Partial<z.infer<typeof supplierSchema>>): void {
  const map: Record<string, string> = {
    category: "category", subtype: "subtype", name: "name", city: "city", country: "country",
    contactName: "contact_name", phone: "phone", email: "email", whatsapp: "whatsapp", website: "website",
    paymentTerms: "payment_terms", cancellationPolicy: "cancellation_policy", notes: "notes", rating: "rating", status: "status",
  };
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [k, col] of Object.entries(map)) {
    if (k in input) { sets.push(`${col} = ?`); vals.push((input as Record<string, unknown>)[k] ?? null); }
  }
  if (!sets.length) return;
  sets.push("updated_at = ?");
  vals.push(nowIso(), id);
  const r = db().prepare(`UPDATE suppliers SET ${sets.join(", ")} WHERE id = ?`).run(...(vals as never[]));
  if (Number(r.changes) === 0) throw new HttpError(404, "not_found");
}

export function deleteSupplier(id: string): void {
  db().prepare("DELETE FROM supplier_rates WHERE supplier_id = ?").run(id);
  const r = db().prepare("DELETE FROM suppliers WHERE id = ?").run(id);
  if (Number(r.changes) === 0) throw new HttpError(404, "not_found");
}

export function listRatesForSupplier(supplierId: string): RateDto[] {
  return (db().prepare("SELECT * FROM supplier_rates WHERE supplier_id = ? ORDER BY created_at DESC").all(supplierId) as unknown as RateRow[]).map(rateDto);
}

export function createRate(input: z.infer<typeof supplierRateSchema>): string {
  const id = uid();
  const now = nowIso();
  db().prepare(
    `INSERT INTO supplier_rates (id, supplier_id, service_name, unit, currency, adult_cost, child_cost,
      valid_from, valid_to, notes, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).run(
    id, input.supplierId, input.serviceName, input.unit, input.currency, input.adultCost ?? null, input.childCost ?? null,
    input.validFrom ?? null, input.validTo ?? null, input.notes ?? null, now, now
  );
  return id;
}

export function updateRate(id: string, input: Partial<z.infer<typeof supplierRateSchema>> & { active?: boolean }): void {
  const map: Record<string, string> = {
    serviceName: "service_name", unit: "unit", currency: "currency", adultCost: "adult_cost", childCost: "child_cost",
    validFrom: "valid_from", validTo: "valid_to", notes: "notes",
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
  const r = db().prepare(`UPDATE supplier_rates SET ${sets.join(", ")} WHERE id = ?`).run(...(vals as never[]));
  if (Number(r.changes) === 0) throw new HttpError(404, "not_found");
}

export function deleteRate(id: string): void {
  const r = db().prepare("DELETE FROM supplier_rates WHERE id = ?").run(id);
  if (Number(r.changes) === 0) throw new HttpError(404, "not_found");
}

export interface ComparisonRow extends RateDto {
  supplierName: string;
  supplierRating: number | null;
  supplierStatus: string;
}

/** Joins active rates to their (non-blacklisted) suppliers for the comparison screen. */
export function compareRates(filter: { category?: string; city?: string; query?: string }): ComparisonRow[] {
  const clauses: string[] = ["sr.active = 1", "s.status != 'blacklisted'"];
  const params: unknown[] = [];
  if (filter.category) { clauses.push("s.category = ?"); params.push(filter.category); }
  if (filter.city) { clauses.push("s.city LIKE ?"); params.push(`%${filter.city}%`); }
  if (filter.query) { clauses.push("(sr.service_name LIKE ? OR s.name LIKE ?)"); params.push(`%${filter.query}%`, `%${filter.query}%`); }

  const rows = db()
    .prepare(
      `SELECT sr.*, s.name AS supplier_name, s.rating AS supplier_rating, s.status AS supplier_status
       FROM supplier_rates sr JOIN suppliers s ON s.id = sr.supplier_id
       WHERE ${clauses.join(" AND ")}
       ORDER BY sr.adult_cost ASC`
    )
    .all(...(params as never[])) as unknown as (RateRow & { supplier_name: string; supplier_rating: number | null; supplier_status: string })[];

  return rows.map((r) => ({ ...rateDto(r), supplierName: r.supplier_name, supplierRating: r.supplier_rating, supplierStatus: r.supplier_status }));
}
