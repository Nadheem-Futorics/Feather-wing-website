import { apiError, ok, readJson } from "@/server/api-util";
import { requireAdminSession } from "@/server/session";
import { supplierRateSchema } from "@/server/schemas";
import { listRatesForSupplier, createRate, updateRate, deleteRate } from "@/server/repo/suppliers";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdminSession();
    const supplierId = new URL(req.url).searchParams.get("supplierId");
    if (!supplierId) return ok({ rates: [] });
    return ok({ rates: listRatesForSupplier(supplierId) });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminSession();
    const data = supplierRateSchema.parse(await readJson(req));
    const id = createRate(data);
    return ok({ id }, 201);
  } catch (e) {
    return apiError(e);
  }
}

const patchSchema = z.object({ id: z.string().min(6), data: supplierRateSchema.partial().extend({ active: z.boolean().optional() }) });

export async function PATCH(req: Request) {
  try {
    await requireAdminSession();
    const { id, data } = patchSchema.parse(await readJson(req));
    updateRate(id, data);
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
    deleteRate(id);
    return ok({ deleted: true });
  } catch (e) {
    return apiError(e);
  }
}
