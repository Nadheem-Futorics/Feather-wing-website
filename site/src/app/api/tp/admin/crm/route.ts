import { apiError, ok, readJson } from "@/server/api-util";
import { requireAdminSession } from "@/server/session";
import { listCrmLeads, listGeneralEnquiries, getGeneralEnquiry, updateGeneralEnquiryStatus } from "@/server/repo/crm";
import { crmPatchSchema } from "@/server/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdminSession();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (id) return ok({ enquiry: getGeneralEnquiry(id) });
    if (url.searchParams.get("view") === "enquiries") return ok({ enquiries: listGeneralEnquiries() });
    return ok({ leads: listCrmLeads() });
  } catch (e) {
    return apiError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdminSession();
    const { id, status, adminNotes } = crmPatchSchema.parse(await readJson(req));
    updateGeneralEnquiryStatus(id, status, adminNotes);
    return ok({ updated: true });
  } catch (e) {
    return apiError(e);
  }
}
