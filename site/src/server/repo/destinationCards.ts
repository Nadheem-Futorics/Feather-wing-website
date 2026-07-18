import { join } from "node:path";
import { mkdirSync, unlink } from "node:fs";
import { db, nowIso, uid } from "../db";
import { HttpError } from "../authz";
import type { z } from "zod";
import type { destinationCardSchema } from "../schemas";

interface DestinationCardRow {
  id: string; title_en: string; title_ar: string; subtitle_en: string | null; subtitle_ar: string | null;
  image_path: string | null; image_mime: string | null; sort_order: number; active: number;
  created_at: string; updated_at: string;
}

function destinationCardDto(r: DestinationCardRow) {
  return {
    id: r.id,
    title: { en: r.title_en, ar: r.title_ar },
    subtitle: { en: r.subtitle_en ?? "", ar: r.subtitle_ar ?? "" },
    hasImage: !!r.image_path,
    active: !!r.active,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
export type DestinationCardDto = ReturnType<typeof destinationCardDto>;

/** Same persistent-volume convention as db.ts (TP_DATA_DIR on Railway) so uploads survive redeploys. */
export function destinationUploadsDir(): string {
  const dir = process.env.TP_DATA_DIR ?? join(process.cwd(), "data");
  const uploads = join(dir, "uploads", "destinations");
  mkdirSync(uploads, { recursive: true });
  return uploads;
}

export function listDestinationCards(includeInactive = false): DestinationCardDto[] {
  const rows = (includeInactive
    ? db().prepare("SELECT * FROM destination_cards ORDER BY sort_order, created_at").all()
    : db().prepare("SELECT * FROM destination_cards WHERE active = 1 AND image_path IS NOT NULL ORDER BY sort_order, created_at").all()
  ) as unknown as DestinationCardRow[];
  return rows.map(destinationCardDto);
}

export function getDestinationCardImagePath(id: string): { path: string; mime: string } | null {
  const r = db().prepare("SELECT image_path, image_mime FROM destination_cards WHERE id = ?").get(id) as
    | { image_path: string | null; image_mime: string | null }
    | undefined;
  if (!r?.image_path || !r.image_mime) return null;
  return { path: join(destinationUploadsDir(), r.image_path), mime: r.image_mime };
}

export function createDestinationCard(input: z.infer<typeof destinationCardSchema>): string {
  const id = uid();
  const now = nowIso();
  const max = db().prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM destination_cards").get() as { m: number };
  db().prepare(
    `INSERT INTO destination_cards (id, title_en, title_ar, subtitle_en, subtitle_ar, sort_order, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).run(id, input.titleEn, input.titleAr, input.subtitleEn ?? null, input.subtitleAr ?? null, max.m + 1, now, now);
  return id;
}

export function updateDestinationCard(id: string, input: Partial<z.infer<typeof destinationCardSchema>> & { active?: boolean }): void {
  const map: Record<string, string> = { titleEn: "title_en", titleAr: "title_ar", subtitleEn: "subtitle_en", subtitleAr: "subtitle_ar" };
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [k, col] of Object.entries(map)) {
    if (k in input) { sets.push(`${col} = ?`); vals.push((input as Record<string, unknown>)[k] ?? null); }
  }
  if ("active" in input) { sets.push("active = ?"); vals.push(input.active ? 1 : 0); }
  if (!sets.length) return;
  sets.push("updated_at = ?");
  vals.push(nowIso(), id);
  const r = db().prepare(`UPDATE destination_cards SET ${sets.join(", ")} WHERE id = ?`).run(...(vals as never[]));
  if (Number(r.changes) === 0) throw new HttpError(404, "not_found");
}

/** Replaces (or sets for the first time) a card's image, deleting the old file if present. */
export function setDestinationCardImage(id: string, storageName: string, mime: string): void {
  const existing = db().prepare("SELECT image_path FROM destination_cards WHERE id = ?").get(id) as { image_path: string | null } | undefined;
  if (!existing) throw new HttpError(404, "not_found");
  const r = db()
    .prepare("UPDATE destination_cards SET image_path = ?, image_mime = ?, updated_at = ? WHERE id = ?")
    .run(storageName, mime, nowIso(), id);
  if (Number(r.changes) === 0) throw new HttpError(404, "not_found");
  if (existing.image_path && existing.image_path !== storageName) {
    unlink(join(destinationUploadsDir(), existing.image_path), () => {});
  }
}

export function deleteDestinationCard(id: string): void {
  const existing = db().prepare("SELECT image_path FROM destination_cards WHERE id = ?").get(id) as { image_path: string | null } | undefined;
  const r = db().prepare("DELETE FROM destination_cards WHERE id = ?").run(id);
  if (Number(r.changes) === 0) throw new HttpError(404, "not_found");
  if (existing?.image_path) unlink(join(destinationUploadsDir(), existing.image_path), () => {});
}
