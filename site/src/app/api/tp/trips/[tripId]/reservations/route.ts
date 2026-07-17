import { requireSessionProfile } from "@/server/session";
import { apiError, ok, readJson } from "@/server/api-util";
import { requireRole } from "@/server/authz";
import { listReservations, createReservation, deleteReservation } from "@/server/repo/misc";
import { reservationCreateSchema } from "@/server/schemas";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tripId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { tripId } = await ctx.params;
    const me = await requireSessionProfile();
    requireRole(tripId, me.id, "viewer");
    return ok({ reservations: listReservations(tripId) });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { tripId } = await ctx.params;
    const me = await requireSessionProfile();
    requireRole(tripId, me.id, "editor");
    const input = reservationCreateSchema.parse(await readJson(req));
    return ok({ id: createReservation(tripId, input, me.id) }, 201);
  } catch (e) {
    return apiError(e);
  }
}

const delSchema = z.object({ reservationId: z.string().min(6) });
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const { tripId } = await ctx.params;
    const me = await requireSessionProfile();
    requireRole(tripId, me.id, "editor");
    const { reservationId } = delSchema.parse(await readJson(req));
    deleteReservation(tripId, reservationId, me.id);
    return ok({ deleted: true });
  } catch (e) {
    return apiError(e);
  }
}
