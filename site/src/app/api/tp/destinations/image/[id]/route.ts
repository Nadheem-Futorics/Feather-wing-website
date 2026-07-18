import { readFile } from "node:fs/promises";
import { getDestinationCardImagePath } from "@/server/repo/destinationCards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Public — destination photos are homepage marketing assets, no auth needed. */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const found = getDestinationCardImagePath(id);
  if (!found) return new Response("Not found", { status: 404 });
  try {
    const buf = await readFile(found.path);
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": found.mime, "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
