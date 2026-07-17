import { requireSessionProfile } from "@/server/session";
import { apiError, ok, readJson } from "@/server/api-util";
import { requireRole } from "@/server/authz";
import { listChecklists, createChecklist, addChecklistItems, toggleChecklistItem, deleteChecklistItem } from "@/server/repo/misc";
import { checklistCreateSchema, checklistItemSchema } from "@/server/schemas";
import { getTrip } from "@/server/repo/trips";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tripId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { tripId } = await ctx.params;
    const me = await requireSessionProfile();
    requireRole(tripId, me.id, "viewer");
    return ok({ checklists: listChecklists(tripId) });
  } catch (e) {
    return apiError(e);
  }
}

const postSchema = z.union([
  z.object({ op: z.literal("create"), list: checklistCreateSchema }),
  z.object({ op: z.literal("add-items"), checklistId: z.string().min(6), items: z.array(checklistItemSchema).min(1).max(50), source: z.enum(["manual", "ai"]).default("manual") }),
  z.object({ op: z.literal("toggle"), itemId: z.string().min(6), done: z.boolean() }),
  z.object({ op: z.literal("delete-item"), itemId: z.string().min(6) }),
  z.object({ op: z.literal("suggest") }),
]);

/** AI-style suggestions are template-based and always editable. */
function suggestions(kind: string, partyType: string, children: number): string[] {
  const base: Record<string, string[]> = {
    packing: ["Passports & IDs", "Chargers and power bank", "Universal adapter", "Comfortable walking shoes", "Light jacket", "Medication kit", "Sunscreen", "Reusable water bottle"],
    "before-departure": ["Check passport validity (6+ months)", "Online check-in", "Notify bank of travel", "Download offline maps", "Arrange airport transfer", "Set out-of-office"],
    documents: ["Flight tickets", "Hotel confirmations", "Travel insurance", "Visa documents", "Vaccination records", "Emergency contacts sheet"],
  };
  const list = base[kind] ?? base.packing;
  const extra = children > 0 ? ["Snacks for the kids", "Entertainment for children", "Stroller / carrier"] : [];
  const corp = partyType === "corporate" ? ["Business cards", "Laptop & presentation files"] : [];
  return [...list, ...extra, ...corp];
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { tripId } = await ctx.params;
    const me = await requireSessionProfile();
    requireRole(tripId, me.id, "editor");
    const body = postSchema.parse(await readJson(req));
    switch (body.op) {
      case "create":
        return ok({ id: createChecklist(tripId, body.list, me.id) }, 201);
      case "add-items":
        addChecklistItems(tripId, body.checklistId, body.items, body.source);
        return ok({ added: body.items.length });
      case "toggle":
        toggleChecklistItem(tripId, body.itemId, body.done);
        return ok({ toggled: true });
      case "delete-item":
        deleteChecklistItem(tripId, body.itemId);
        return ok({ deleted: true });
      case "suggest": {
        const trip = getTrip(tripId);
        const kinds: ("packing" | "before-departure" | "documents")[] = ["packing", "before-departure", "documents"];
        for (const kind of kinds) {
          const id = createChecklist(tripId, { name: kind === "packing" ? "Packing" : kind === "documents" ? "Documents" : "Before departure", kind }, me.id);
          addChecklistItems(tripId, id, suggestions(kind, trip.partyType, trip.children).map((text) => ({ text })), "ai");
        }
        return ok({ suggested: true });
      }
    }
  } catch (e) {
    return apiError(e);
  }
}
