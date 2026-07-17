import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { hashPassword } from "./password";

/**
 * SQLite (built into Node ≥22.5) — zero native dependencies.
 * The data-access layer below is plain SQL behind repository modules,
 * so migrating to PostgreSQL/Supabase later means re-implementing the
 * repositories, not the feature code.
 */

let _db: DatabaseSync | null = null;

export function db(): DatabaseSync {
  if (_db) return _db;
  const dir = process.env.TP_DATA_DIR ?? join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  _db = new DatabaseSync(join(dir, "trip-planner.db"));
  _db.exec("PRAGMA journal_mode = WAL;");
  _db.exec("PRAGMA foreign_keys = ON;");
  migrate(_db);
  return _db;
}

function migrate(d: DatabaseSync) {
  const schema = readFileSync(join(process.cwd(), "src", "server", "schema.sql"), "utf8");
  d.exec(schema);
  seedPackages(d);
  seedAdminUser(d);
}

/**
 * Bootstraps one admin account on first run so the portal is usable out of
 * the box. Username/password come from env (falling back to the previous
 * shared ADMIN_ACCESS_KEY as the initial password for continuity, then a
 * documented dev default) — change it via the portal's "Change password"
 * once logged in. Never re-seeds once an account exists.
 */
function seedAdminUser(d: DatabaseSync) {
  const row = d.prepare("SELECT COUNT(*) AS n FROM admin_users").get() as { n: number };
  if (row.n > 0) return;
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD ?? process.env.ADMIN_ACCESS_KEY ?? "fwt-admin-2026";
  const now = new Date().toISOString();
  d.prepare(
    "INSERT INTO admin_users (id, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(crypto.randomUUID(), username, hashPassword(password), now, now);
}

/** Seed company packages from the site's existing featured-trip data. */
function seedPackages(d: DatabaseSync) {
  const row = d.prepare("SELECT COUNT(*) AS n FROM company_packages").get() as { n: number };
  if (row.n > 0) return;
  // Mirrors src/data/trips.ts (demo inventory — EDITABLE via admin/travel-content later)
  const seed = [
    ["pkg-alula", "AlUla & Hegra Discovery", "اكتشاف العُلا والحِجر", "AlUla, Saudi Arabia", "العُلا، السعودية", "saudi", "4 days", "٤ أيام", "SAR —", 26.6086, 37.9236],
    ["pkg-empty-quarter", "Empty Quarter Expedition", "بعثة الربع الخالي", "Rub' al Khali", "الربع الخالي", "desert", "3 days", "٣ أيام", "SAR —", 20.0, 51.0],
    ["pkg-umrah", "Umrah Comfort Package", "باقة العمرة الميسّرة", "Makkah & Madinah", "مكة والمدينة", "islamic", "7 days", "٧ أيام", "SAR —", 24.4672, 39.6111],
    ["pkg-istanbul", "Istanbul Heritage Escape", "إطلالة على تراث إسطنبول", "Istanbul, Türkiye", "إسطنبول، تركيا", "international", "6 days", "٦ أيام", "SAR —", 41.0082, 28.9784],
    ["pkg-maldives", "Maldives Serenity Week", "أسبوع الصفاء في المالديف", "Maldives", "المالديف", "international", "7 days", "٧ أيام", "SAR —", 3.2028, 73.2207],
    ["pkg-asir", "Asir Mountains Convoy", "قافلة جبال عسير", "Abha & Rijal Almaa", "أبها ورجال ألمع", "group", "4 days", "٤ أيام", "SAR —", 18.2465, 42.5117],
    ["pkg-riyadh-retreat", "Executive Team Retreat", "خلوة الفرق التنفيذية", "Riyadh, Saudi Arabia", "الرياض، السعودية", "corporate", "2–3 days", "يومان–٣ أيام", "SAR —", 24.7136, 46.6753],
    ["pkg-red-sea", "Red Sea Coastal Escape", "إطلالة على ساحل البحر الأحمر", "Red Sea Coast", "ساحل البحر الأحمر", "saudi", "4 days", "٤ أيام", "SAR —", 22.3, 39.1],
  ] as const;
  const ins = d.prepare(
    `INSERT INTO company_packages (id, title_en, title_ar, place_en, place_ar, category, duration_en, duration_ar, price_display, lat, lng, inclusions, exclusions, active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
  );
  const now = new Date().toISOString();
  const inc = JSON.stringify(["Transport", "Guide", "Accommodation as described"]);
  const exc = JSON.stringify(["International flights", "Personal expenses"]);
  for (const p of seed) ins.run(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], inc, exc, now);
}

export const nowIso = () => new Date().toISOString();
export const uid = () => crypto.randomUUID();

/** tiny helper for JSON columns */
export const asJson = (v: unknown) => (v == null ? null : JSON.stringify(v));
export function fromJson<T>(v: unknown, fallback: T): T {
  if (typeof v !== "string" || v === "") return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}
