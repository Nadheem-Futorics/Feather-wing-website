/**
 * Shared Gemini transport used by both the trip-planner assistant
 * (assistant.ts) and the public concierge (concierge.ts).
 *
 * Why this exists: an overloaded Gemini model does not reliably fail fast.
 * `:streamGenerateContent?alt=sse` has been observed accepting the TCP
 * connection and then never sending response headers at all — no status, no
 * body, no error — which hung the calling route indefinitely and left the
 * visitor staring at a chat spinner that would never resolve.
 *
 * The guard is deliberately on time-to-headers rather than on the whole
 * request: once headers arrive the stream is healthy and may legitimately
 * take a while to finish generating, and a total-duration cap would truncate
 * long replies mid-sentence. A stall *after* headers is not covered here.
 */

/** How long to wait for response headers before giving up on a request. */
export const GEMINI_HEADER_TIMEOUT_MS = 45_000;

/** POSTs JSON to Gemini, aborting if response headers never arrive. */
export async function geminiFetch(url: string, body: unknown): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_HEADER_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    // Headers are in (or the request already failed) — stop guarding so the
    // body stream is free to take as long as the reply legitimately needs.
    clearTimeout(timer);
  }
}
