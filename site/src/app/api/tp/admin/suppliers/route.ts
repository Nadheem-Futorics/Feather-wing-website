import { apiError, ok, readJson } from "@/server/api-util";
import { requireAdminSession } from "@/server/session";
import { supplierSchema } from "@/server/schemas";
import { listSuppliers, createSupplier, updateSupplier, deleteSupplier } from "@/server/repo/suppliers";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession();
    return ok({ suppliers: listSuppliers(true) });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminSession();
    const data = supplierSchema.parse(await readJson(req));
    const id = createSupplier(data);
    return ok({ id }, 201);
  } catch (e) {
    return apiError(e);
  }
}

const patchSchema = z.object({ id: z.string().min(6), data: supplierSchema.partial() });

export async function PATCH(req: Request) {
  try {
    await requireAdminSession();
    const { id, data } = patchSchema.parse(await readJson(req));
    updateSupplier(id, data);
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
    deleteSupplier(id);
    return ok({ deleted: true });
  } catch (e) {
    return apiError(e);
  }
}
