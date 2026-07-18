import { apiError, ok } from "@/server/api-util";
import { requireAdminSession } from "@/server/session";
import { HttpError } from "@/server/authz";
import { destinationUploadsDir, setDestinationCardImage } from "@/server/repo/destinationCards";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

/** Uploads (or replaces) a destination card's photo. Stored under the persistent volume, served publicly via /api/tp/destinations/image/[id]. */
export async function POST(req: Request) {
  try {
    await requireAdminSession();
    const form = await req.formData();
    const id = String(form.get("id") ?? "");
    const file = form.get("file");
    if (!id) throw new HttpError(400, "missing_id", "Missing destination id.");
    if (!(file instanceof File)) throw new HttpError(400, "no_file", "Attach a file field named 'file'.");
    if (!ALLOWED_MIME.has(file.type)) throw new HttpError(415, "bad_type", "Allowed: JPEG, PNG, WebP.");
    if (file.size > MAX_BYTES) throw new HttpError(413, "too_large", "Maximum size is 5 MB.");

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const storageName = `${id}.${ext}`;
    await writeFile(join(destinationUploadsDir(), storageName), Buffer.from(await file.arrayBuffer()));
    setDestinationCardImage(id, storageName, file.type);
    return ok({ uploaded: true });
  } catch (e) {
    return apiError(e);
  }
}
