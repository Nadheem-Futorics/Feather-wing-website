import { requireSessionProfile } from "@/server/session";
import { apiError, ok, readJson } from "@/server/api-util";
import { requireRole } from "@/server/authz";
import { listExpenses, createExpense, deleteExpense, settlementSummary } from "@/server/repo/misc";
import { getTrip, listMembers } from "@/server/repo/trips";
import { expenseCreateSchema } from "@/server/schemas";
import { fxSource } from "@/server/providers/fx";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tripId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { tripId } = await ctx.params;
    const me = await requireSessionProfile();
    requireRole(tripId, me.id, "viewer");
    return ok({
      expenses: listExpenses(tripId),
      settlement: settlementSummary(tripId),
      members: listMembers(tripId),
      baseCurrency: getTrip(tripId).currency,
      fx: fxSource(),
    });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { tripId } = await ctx.params;
    const me = await requireSessionProfile();
    requireRole(tripId, me.id, "editor");
    const input = expenseCreateSchema.parse(await readJson(req));
    const id = createExpense(tripId, input, getTrip(tripId).currency, me.id);
    return ok({ id }, 201);
  } catch (e) {
    return apiError(e);
  }
}

const delSchema = z.object({ expenseId: z.string().min(6) });
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const { tripId } = await ctx.params;
    const me = await requireSessionProfile();
    requireRole(tripId, me.id, "editor");
    const { expenseId } = delSchema.parse(await readJson(req));
    deleteExpense(tripId, expenseId, me.id);
    return ok({ deleted: true });
  } catch (e) {
    return apiError(e);
  }
}
