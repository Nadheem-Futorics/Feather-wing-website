import { requireSessionProfile } from "@/server/session";
import { apiError, ok } from "@/server/api-util";
import { requireRole, rateLimit, HttpError } from "@/server/authz";
import { listDocuments, createDocument } from "@/server/repo/misc";
import { signDocToken } from "@/server/docs";
import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tripId: string }> };

const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024;

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { tripId } = await ctx.params;
    const me = await requireSessionProfile();
    requireRole(tripId, me.id, "viewer");
    const docs = listDocuments(tripId).map((d) => ({ ...d, url: `/api/tp/trips/${tripId}/documents/${d.id}?t=${signDocToken(d.id)}` }));
    return ok({ documents: docs });
  } catch (e) {
    return apiError(e);
  }
}

/** Private storage under data/documents (outside /public); served via signed URLs only. */
export async function POST(req: Request, ctx: Ctx) {
  try {
    const { tripId } = await ctx.params;
    const me = await requireSessionProfile();
    requireRole(tripId, me.id, "editor");
    rateLimit(`docs:${me.id}`, 40, 3600);
    const form = await req.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "other").slice(0, 30);
    if (!(file instanceof File)) throw new HttpError(400, "no_file", "Attach a file field named 'file'.");
    if (!ALLOWED_MIME.has(file.type)) throw new HttpError(415, "bad_type", "Allowed: PDF, JPEG, PNG, WebP.");
    if (file.size > MAX_BYTES) throw new HttpError(413, "too_large", "Maximum size is 8 MB.");

    const safeName = file.name.replace(/[^\w.\-()\s؀-ۿ]/g, "_").slice(0, 120) || "document";
    const dir = join(process.cwd(), "data", "documents", tripId);
    mkdirSync(dir, { recursive: true });
    const storageName = `${crypto.randomUUID()}-${safeName}`;
    await writeFile(join(dir, storageName), Buffer.from(await file.arrayBuffer()));
    const id = createDocument(tripId, { fileName: safeName, mime: file.type, size: file.size, storagePath: join(tripId, storageName), kind }, me.id);
    return ok({ id }, 201);
  } catch (e) {
    return apiError(e);
  }
}
