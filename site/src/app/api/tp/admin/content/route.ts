import { apiError, ok, readJson } from "@/server/api-util";
import { requireAdminSession } from "@/server/session";
import { featuredTripSchema, offerSchema, kbArticleSchema } from "@/server/schemas";
import {
  listFeaturedTrips, createFeaturedTrip, updateFeaturedTrip, deleteFeaturedTrip,
  listOffers, createOffer, updateOffer, deleteOffer,
  listKbArticles, createKbArticle, updateKbArticle, deleteKbArticle,
} from "@/server/repo/content";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession();
    return ok({ trips: listFeaturedTrips(true), offers: listOffers(true), kb: listKbArticles(true) });
  } catch (e) {
    return apiError(e);
  }
}

const postSchema = z.union([
  z.object({ kind: z.literal("trip"), data: featuredTripSchema }),
  z.object({ kind: z.literal("offer"), data: offerSchema }),
  z.object({ kind: z.literal("kb"), data: kbArticleSchema }),
]);

export async function POST(req: Request) {
  try {
    await requireAdminSession();
    const body = postSchema.parse(await readJson(req));
    const id = body.kind === "trip" ? createFeaturedTrip(body.data) : body.kind === "offer" ? createOffer(body.data) : createKbArticle(body.data);
    return ok({ id }, 201);
  } catch (e) {
    return apiError(e);
  }
}

const patchSchema = z.union([
  z.object({ kind: z.literal("trip"), id: z.string().min(6), data: featuredTripSchema.partial().extend({ active: z.boolean().optional() }) }),
  z.object({ kind: z.literal("offer"), id: z.string().min(6), data: offerSchema.partial().extend({ active: z.boolean().optional() }) }),
  z.object({ kind: z.literal("kb"), id: z.string().min(6), data: kbArticleSchema.partial().extend({ active: z.boolean().optional() }) }),
]);

export async function PATCH(req: Request) {
  try {
    await requireAdminSession();
    const body = patchSchema.parse(await readJson(req));
    if (body.kind === "trip") updateFeaturedTrip(body.id, body.data);
    else if (body.kind === "offer") updateOffer(body.id, body.data);
    else updateKbArticle(body.id, body.data);
    return ok({ updated: true });
  } catch (e) {
    return apiError(e);
  }
}

const delSchema = z.object({ kind: z.enum(["trip", "offer", "kb"]), id: z.string().min(6) });

export async function DELETE(req: Request) {
  try {
    await requireAdminSession();
    const { kind, id } = delSchema.parse(await readJson(req));
    if (kind === "trip") deleteFeaturedTrip(id);
    else if (kind === "offer") deleteOffer(id);
    else deleteKbArticle(id);
    return ok({ deleted: true });
  } catch (e) {
    return apiError(e);
  }
}
