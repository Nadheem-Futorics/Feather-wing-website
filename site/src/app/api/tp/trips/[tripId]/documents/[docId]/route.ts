import { apiError } from "@/server/api-util";
import { HttpError } from "@/server/authz";
import { getDocument } from "@/server/repo/misc";
import { verifyDocToken } from "@/server/docs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tripId: string; docId: string }> };

/** Serves a private file when the signed token is valid (15-minute expiry). */
export async function GET(req: Request, ctx: Ctx) {
  try {
    const { tripId, docId } = await ctx.params;
    const token = new URL(req.url).searchParams.get("t");
    if (!verifyDocToken(docId, token)) throw new HttpError(403, "invalid_token", "This link has expired — reopen the documents page.");
    const doc = getDocument(tripId, docId);
    const buf = await readFile(join(process.cwd(), "data", "documents", doc.storagePath));
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": doc.mime,
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.fileName)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
