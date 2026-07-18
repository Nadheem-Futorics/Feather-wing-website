import { apiError, ok, readJson } from "@/server/api-util";
import { requireAdminSession } from "@/server/session";
import { destinationCardSchema } from "@/server/schemas";
import { listDestinationCards, createDestinationCard, updateDestinationCard, deleteDestinationCard } from "@/server/repo/destinationCards";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession();
    return ok({ destinations: listDestinationCards(true) });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminSession();
    const data = destinationCardSchema.parse(await readJson(req));
    const id = createDestinationCard(data);
    return ok({ id }, 201);
  } catch (e) {
    return apiError(e);
  }
}

const patchSchema = z.object({ id: z.string().min(6), data: destinationCardSchema.partial().extend({ active: z.boolean().optional() }) });

export async function PATCH(req: Request) {
  try {
    await requireAdminSession();
    const { id, data } = patchSchema.parse(await readJson(req));
    updateDestinationCard(id, data);
    return ok({ updated: true });
  } catch (e) {
    return apiError(e);
  }
}

const delSchema = z.object({ id: z.string().min(6) });

export async function DELETE(req: Request) {
  try {
    await requireAdminSession();
    const { id } = delSchema.parse(await readJson(req));
    deleteDestinationCard(id);
    return ok({ deleted: true });
  } catch (e) {
    return apiError(e);
  }
}
