import { apiError, ok, readJson } from "@/server/api-util";
import { rateLimit } from "@/server/authz";
import { conciergeChatSchema } from "@/server/schemas";
import { conciergeProvider } from "@/server/ai/concierge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Which provider is answering — lets the widget show a "development mode" hint. */
export async function GET() {
  return ok({ provider: conciergeProvider().id });
}

/** Streaming chat (newline-delimited JSON events), rate-limited per IP. */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    rateLimit(`concierge:${ip}`, 20, 3600);
    const input = conciergeChatSchema.parse(await readJson(req));
    const provider = conciergeProvider();

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        send({ type: "meta", provider: provider.id });
        try {
          for await (const ev of provider.run({ messages: input.messages, lang: input.lang })) {
            send(ev);
          }
        } catch (e) {
          console.error("[concierge-api]", e instanceof Error ? e.message : e);
          send({ type: "error", message: "The concierge is temporarily unavailable. Please try again." });
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
    });
  } catch (e) {
    return apiError(e);
  }
}
