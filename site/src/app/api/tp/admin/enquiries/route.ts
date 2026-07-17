import { apiError, ok, readJson } from "@/server/api-util";
import { requireAdminSession } from "@/server/session";
import { listEnquiries, getEnquiry, updateEnquiryStatus } from "@/server/repo/enquiries";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdminSession();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (id) return ok({ enquiry: getEnquiry(id) });
    return ok({ enquiries: listEnquiries() });
  } catch (e) {
    return apiError(e);
  }
}

const patchSchema = z.object({ id: z.string().min(6), status: z.enum(["new", "in_progress", "quoted", "closed"]), adminNotes: z.string().max(2000).optional() });

export async function PATCH(req: Request) {
  try {
    await requireAdminSession();
    const { id, status, adminNotes } = patchSchema.parse(await readJson(req));
    updateEnquiryStatus(id, status, adminNotes);
    return ok({ updated: true });
  } catch (e) {
    return apiError(e);
  }
}
