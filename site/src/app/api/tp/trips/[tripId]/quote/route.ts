import { requireSessionProfile } from "@/server/session";
import { apiError, ok, readJson } from "@/server/api-util";
import { requireRole, rateLimit, logActivity } from "@/server/authz";
import { quoteCreateSchema } from "@/server/schemas";
import { createQuoteEnquiry } from "@/server/repo/enquiries";
import { buildTripContext } from "@/server/ai/assistant";
import { listReservations } from "@/server/repo/misc";
import { contact } from "@/data/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tripId: string }> };

/**
 * Converts the trip into a company quote enquiry.
 * Notification: logged server-side (the site's enquiry flow has no email
 * provider configured yet — same behaviour as the existing contact form).
 * WhatsApp deep link carries a short reference, never the itinerary.
 */
export async function POST(req: Request, ctx: Ctx) {
  try {
    const { tripId } = await ctx.params;
    const me = await requireSessionProfile();
    requireRole(tripId, me.id, "viewer");
    rateLimit(`quote:${me.id}`, 10, 3600);
    const input = quoteCreateSchema.parse(await readJson(req));

    const context = buildTripContext(tripId);
    const summary = {
      destinations: context.destinations.map((d) => d.name),
      dates: { start: context.trip.startDate, end: context.trip.endDate },
      travelers: { adults: context.trip.adults, children: context.trip.children },
      days: context.days.map((d) => ({
        day: d.dayIndex + 1, date: d.date, destination: d.destination,
        items: d.items.map((i) => ({ name: i.name, category: i.category, time: i.startTime, cost: i.cost, currency: i.currency })),
      })),
      packages: context.days.flatMap((d) => d.items).filter((i) => i.category === "package").map((i) => i.name),
      estimatedActivityCosts: context.days.flatMap((d) => d.items).reduce((s, i) => s + (i.cost ?? 0), 0),
      reservations: listReservations(tripId).map((r) => ({ type: r.type, status: r.status, startAt: r.startAt })),
      specialRequirements: [context.trip.dietary, context.trip.accessibility, context.trip.notes].filter(Boolean),
      pace: context.trip.pace,
      budget: context.trip.budgetTotal,
      currency: context.trip.currency,
    };

    const { id, reference } = createQuoteEnquiry(input, tripId, summary);
    logActivity(tripId, me.id, "quote.submitted", reference);
    // Customer name/email are already durably stored in quote_enquiries
    // (reviewable at /admin/trip-enquiries) — the server log only needs the
    // reference to correlate, not a second unencrypted copy of the PII.
    console.log(`[tp-quote] New enquiry ${reference}`);

    const waText = encodeURIComponent(
      `Hello Feather Wing Tours! I submitted trip enquiry ${reference} (${summary.destinations.join(", ")}, ${context.trip.adults + context.trip.children} travellers). Looking forward to your quote.`
    );
    return ok({ id, reference, whatsappUrl: `https://wa.me/${contact.whatsapp}?text=${waText}` }, 201);
  } catch (e) {
    return apiError(e);
  }
}
