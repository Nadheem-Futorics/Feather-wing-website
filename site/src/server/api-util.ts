import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./authz";

/** Consistent JSON errors; provider details never leak to clients. */
export function apiError(e: unknown): NextResponse {
  if (e instanceof HttpError) {
    return NextResponse.json({ ok: false, error: e.code, message: e.message }, { status: e.status });
  }
  if (e instanceof ZodError) {
    return NextResponse.json(
      { ok: false, error: "validation", issues: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 422 }
    );
  }
  console.error("[tp-api]", e instanceof Error ? e.message : e);
  return NextResponse.json({ ok: false, error: "internal", message: "Something went wrong." }, { status: 500 });
}

export function ok(data: unknown, init?: number): NextResponse {
  return NextResponse.json({ ok: true, data }, { status: init ?? 200 });
}

// Comfortably covers every legitimate JSON payload in this app (chat
// messages, form submissions, CRUD bodies); file uploads use req.formData()
// in their own routes and never go through this helper.
const MAX_JSON_BODY_BYTES = 1_000_000;

export async function readJson(req: Request): Promise<unknown> {
  const contentLength = req.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_JSON_BODY_BYTES) {
    throw new HttpError(413, "payload_too_large", "Request body is too large.");
  }
  let text: string;
  try {
    text = await req.text();
  } catch {
    throw new HttpError(400, "invalid_json", "Request body must be JSON.");
  }
  if (text.length > MAX_JSON_BODY_BYTES) {
    throw new HttpError(413, "payload_too_large", "Request body is too large.");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "invalid_json", "Request body must be JSON.");
  }
}
