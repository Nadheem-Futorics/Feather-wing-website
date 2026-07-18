import { NextRequest, NextResponse } from "next/server";
import { createGeneralEnquiry } from "@/server/repo/crm";

/**
 * Enquiry endpoint — persists homepage contact-form submissions into the
 * CRM's lead inbox (general_enquiries table, visible at /admin/crm).
 *
 * Spam prevention:
 *  • honeypot field ("website") must be empty
 *  • sub-3s submissions are rejected (bots fill instantly)
 *  • basic field validation mirrors the client
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const seen = new Map<string, number[]>(); // naive in-memory rate limit
const MAX_BODY_BYTES = 20_000; // this form has no file fields — a few KB of text is the realistic ceiling

export async function POST(req: NextRequest) {
  const contentLength = req.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "payload-too-large" }, { status: 413 });
  }
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "payload-too-large" }, { status: 413 });
  }
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }

  // honeypot
  if (typeof body.website === "string" && body.website.trim() !== "") {
    // pretend success so bots learn nothing
    return NextResponse.json({ ok: true });
  }

  // timing check
  const elapsed = Number(body.elapsedMs ?? 0);
  if (elapsed > 0 && elapsed < 3000) {
    return NextResponse.json({ ok: true });
  }

  // rate limit: 5 requests / 10 min per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const windowStart = now - 10 * 60 * 1000;
  const hits = (seen.get(ip) ?? []).filter((t) => t > windowStart);
  if (hits.length >= 5) {
    return NextResponse.json({ ok: false, error: "rate-limited" }, { status: 429 });
  }
  hits.push(now);
  seen.set(ip, hits);

  // validation (length caps are defense-in-depth against abusive payloads,
  // independent of the body-size guard above)
  const name = String(body.name ?? "").trim().slice(0, 120);
  const mobile = String(body.mobile ?? "").trim().slice(0, 20);
  const email = String(body.email ?? "").trim().slice(0, 200);
  const service = String(body.service ?? "").trim().slice(0, 120);
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) : undefined;
  if (
    !name ||
    !/^[+\d][\d\s\-()]{6,18}$/.test(mobile) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !service
  ) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  }

  const destination = typeof body.destination === "string" ? body.destination.slice(0, 200) : undefined;
  const departure = typeof body.departure === "string" ? body.departure.slice(0, 200) : undefined;
  const travelDate = typeof body.date === "string" ? body.date.slice(0, 40) : undefined;
  const travellers =
    typeof body.travellers === "string" ? body.travellers.slice(0, 40)
    : typeof body.travellers === "number" ? String(body.travellers)
    : undefined;
  const contactMethod = typeof body.contactMethod === "string" ? body.contactMethod.slice(0, 40) : undefined;

  const { id } = createGeneralEnquiry({ name, email, mobile, service, destination, departure, travelDate, travellers, contactMethod, notes });
  console.log("[enquiry] saved", id);

  return NextResponse.json({ ok: true });
}
