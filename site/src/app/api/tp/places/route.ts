import { requireSessionProfile } from "@/server/session";
import { apiError, ok } from "@/server/api-util";
import { rateLimit } from "@/server/authz";
import { placeSearchSchema } from "@/server/schemas";
import { placesProvider } from "@/server/providers/places";
import { listPackages } from "@/server/repo/enquiries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const me = await requireSessionProfile();
    rateLimit(`places:${me.id}`, 120, 3600);
    const url = new URL(req.url);
    const q = placeSearchSchema.parse(Object.fromEntries(url.searchParams.entries()));
    const provider = placesProvider();
    const results = await provider.search(q);

    // Surface matching company packages alongside discovery results.
    const needle = `${q.q ?? ""} ${q.destination ?? ""}`.toLowerCase();
    const packages = listPackages()
      .filter((p) => !needle.trim() || p.title.en.toLowerCase().includes(needle.trim()) || p.place.en.toLowerCase().includes(needle.trim()))
      .slice(0, 4)
      .map((p) => ({
        placeId: `pkg:${p.id}`, name: p.title.en, category: "package", address: p.place.en,
        lat: p.lat ?? 0, lng: p.lng ?? 0, summary: `${p.duration.en} · ${p.priceDisplay ?? ""}`, source: "package" as const,
        packageId: p.id, inclusions: p.inclusions,
      }));

    return ok({ results, packages, liveData: provider.liveData, source: provider.liveData ? "Google Places" : "Development data" });
  } catch (e) {
    return apiError(e);
  }
}
